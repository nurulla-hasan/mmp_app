import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from 'lucide-react-native';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ProAvatarRing } from '../../components/ui/pro-avatar-ring';
import { ReviewModal } from '../../components/surveyors/review-modal';
import { SurveyorDetailSkeleton } from '../../components/common/page-loading-skeletons';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useAuthStore } from '../../stores/auth-store';
import { useSurveyorBySlug } from '../../hooks/queries/use-surveyors';
import { openPhoneCall, openSurveyorWhatsApp } from '../../lib/contact';
import {
  getSurveyorDisplayName,
  getSurveyorLocation,
  getSurveyorWhatsApp,
} from '../../lib/surveyor-utils';
import { toBengaliDigits } from '../../lib/utils';
import type { TSurveyorReview } from '../../types/surveyor';

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function ReviewCard({ review, pending }: { review: TSurveyorReview; pending?: boolean }) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const bracket = review.comment.match(/^\[(.*?)\]\s*(.*)$/);
  const service = review.serviceName || bracket?.[1];
  const comment = bracket?.[2] || review.comment;

  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pending ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewName, { color: colors.text }]}>{review.reviewerName}</Text>
          <View style={styles.reviewStars}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={11}
                color='#f59e0b'
                fill={index < review.rating ? '#f59e0b' : 'transparent'}
              />
            ))}
            {service ? (
              <Text style={[styles.reviewService, { color: colors.textMuted }]}>— {service}</Text>
            ) : null}
          </View>
        </View>
        {pending ? <Badge label='যাচাইয়ের অপেক্ষায়' variant='warning' /> : null}
      </View>
      <Text style={[styles.reviewComment, { color: colors.text }]}>{comment}</Text>
      <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
        {formatDate(review.createdAt)}
      </Text>
    </View>
  );
}

export default function SurveyorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { user, isAuthenticated } = useAuthStore();
  const query = useSurveyorBySlug(slug);

  if (query.isLoading) {
    return <SurveyorDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>সার্ভেয়ার খুঁজে পাওয়া যায়নি</Text>
        <Text style={[styles.stateText, { color: colors.textMuted }]}>
          প্রোফাইলটি সক্রিয় নেই অথবা মুছে ফেলা হয়েছে।
        </Text>
        <Button title='সার্ভেয়ার তালিকায় ফিরুন' onPress={() => router.back()} />
      </View>
    );
  }

  const surveyor = query.data;
  const name = getSurveyorDisplayName(surveyor);
  const location = getSurveyorLocation(surveyor);
  const whatsapp = getSurveyorWhatsApp(surveyor);
  const phone = surveyor.user?.phone || '';
  const verified = surveyor.isVerified ?? surveyor.verificationStatus === 'APPROVED';
  const isPro = Boolean(surveyor.user?.isSubscribed || surveyor.isSubscribed);
  const imageUrl = surveyor.user?.imageUrl || surveyor.profilePhoto;
  const joined = surveyor.user?.createdAt || surveyor.createdAt || surveyor.joinedAt;
  const rating = Number(surveyor.rating || 0);
  const totalReviews = Number(surveyor.totalReviews || 0);
  const approvedReviews = (surveyor.reviews ?? []).filter(
    (review) => review.status === 'APPROVED'
  );
  const pendingReviews = (surveyor.reviews ?? []).filter(
    (review) => review.status === 'PENDING'
  );
  const ownProfile = Boolean(user && surveyor.user?.id && user.id === surveyor.user.id);

  const handleWhatsApp = async () => {
    try {
      await openSurveyorWhatsApp(
        whatsapp,
        name,
        `হ্যালো, আমি Mouza Map Pro থেকে দেখছি। ${name} এর সেবা সম্পর্কে জানতে চাই।`
      );
    } catch {
      Alert.alert('যোগাযোগ করা যাচ্ছে না', 'WhatsApp বা ব্রাউজার খোলা যায়নি।');
    }
  };

  const handleCall = async () => {
    try {
      await openPhoneCall(phone);
    } catch {
      Alert.alert('কল করা যাচ্ছে না', 'এই ডিভাইস থেকে কল চালু করা যায়নি।');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.heroTop}>
          <ProAvatarRing size={66} isPro={isPro}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <Text style={[styles.avatarChar, { color: colors.primary }]}>{name.charAt(0)}</Text>
              </View>
            )}
          </ProAvatarRing>

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={[styles.heroName, { color: colors.text }]}>{name}</Text>
              {verified ? <BadgeCheck size={17} color={colors.primary} /> : null}
            </View>
            <Text style={[styles.heroHeadline, { color: colors.textMuted }]}>
              {surveyor.headline || 'পেশাদার ভূমি জরিপকারী'}
            </Text>
            <View style={styles.heroMetaWrap}>
              {location.district || location.upazila ? (
                <View style={styles.metaItem}>
                  <MapPin size={12} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {[location.upazila, location.district].filter(Boolean).join(', ')}
                  </Text>
                </View>
              ) : null}
              {(surveyor.experienceYears || 0) > 0 ? (
                <View style={styles.metaItem}>
                  <Briefcase size={12} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {toBengaliDigits(surveyor.experienceYears || 0)} বছর অভিজ্ঞতা
                  </Text>
                </View>
              ) : null}
              {joined ? (
                <View style={styles.metaItem}>
                  <CalendarDays size={12} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {formatDate(joined)} থেকে সক্রিয়
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.ratingPanel,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            {rating > 0 ? (
              <>
                <View style={styles.ratingLine}>
                  <Star size={14} color='#f59e0b' fill='#f59e0b' />
                  <Text style={[styles.ratingNumber, { color: colors.text }]}>
                    {toBengaliDigits(rating.toFixed(1))}
                  </Text>
                </View>
                <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
                  {toBengaliDigits(totalReviews)} রিভিউ
                </Text>
              </>
            ) : (
              <Badge label='নতুন' variant='free' />
            )}
          </View>
        </View>

        {surveyor.bio ? (
          <Text style={[styles.bio, { color: colors.textMuted }]}>{surveyor.bio}</Text>
        ) : null}

        <View style={styles.contactRow}>
          {whatsapp ? (
            <Button
              title='WhatsApp-এ যোগাযোগ'
              onPress={handleWhatsApp}
              icon={<MessageCircle size={14} color='#fff' />}
              style={{ flex: 1 }}
            />
          ) : null}
          {phone ? (
            <Button
              title='কল করুন'
              variant='outline'
              onPress={handleCall}
              icon={<Phone size={14} color={colors.primary} />}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>সেবাসমূহ ও মূল্য</Text>
        {(surveyor.surveyorServices ?? []).length > 0 ? (
          surveyor.surveyorServices!.map((item) => (
            <View
              key={item.id}
              style={[styles.serviceRow, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.text }]}>
                  {item.service.name}
                </Text>
                {item.service.description ? (
                  <Text
                    style={[styles.serviceDescription, { color: colors.textMuted }]}
                    numberOfLines={2}
                  >
                    {item.service.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.priceBadge}>
                <Banknote size={12} color={colors.primary} />
                <Text style={[styles.priceText, { color: colors.primary }]}>
                  ৳{Number(item.startingPrice || 0).toLocaleString('bn-BD')} থেকে
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            এখনো মূল্য নির্ধারণ করা হয়নি। সরাসরি যোগাযোগ করুন।
          </Text>
        )}
      </View>

      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>সেবার এলাকা</Text>
        {(surveyor.serviceAreas ?? []).length > 0 ? (
          surveyor.serviceAreas!.map((area, index) => (
            <View key={area.id || `${area.district}-${index}`} style={styles.areaBlock}>
              <View style={styles.areaTitle}>
                <MapPin size={13} color={colors.primary} />
                <Text style={[styles.areaDistrict, { color: colors.text }]}>{area.district}</Text>
              </View>
              <View style={styles.areaChips}>
                {area.upazilas.length ? (
                  area.upazilas.map((upazila) => (
                    <Badge key={upazila} label={upazila} variant='neutral' />
                  ))
                ) : (
                  <Badge label='সমগ্র জেলা' variant='neutral' />
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            সেবার এলাকা উল্লেখ করা হয়নি।
          </Text>
        )}
      </View>

      {verified ? (
        <View
          style={[
            styles.verifiedCard,
            {
              borderColor: `${colors.primary}40`,
              backgroundColor: `${colors.primary}0D`,
            },
          ]}
        >
          <CheckCircle2 size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.verifiedTitle, { color: colors.primary }]}>Mouza Map Pro ভেরিফাইড সার্ভেয়ার</Text>
            <Text style={[styles.verifiedText, { color: colors.textMuted }]}>
              পেশাদার তথ্য অ্যাডমিন যাচাই করে অনুমোদন করেছে।
              {surveyor.verifiedAt ? ` ভেরিফাইড: ${formatDate(surveyor.verifiedAt)}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ক্লায়েন্ট রিভিউ</Text>
            <Text style={[styles.reviewSummary, { color: colors.textMuted }]}>
              {toBengaliDigits(totalReviews)} টি অনুমোদিত রিভিউ
            </Text>
          </View>
          {!ownProfile &&
          surveyor.id &&
          surveyor.slug &&
          (surveyor.surveyorServices?.length || 0) > 0 ? (
            <ReviewModal
              surveyorProfileId={surveyor.id}
              surveyorSlug={surveyor.slug}
              services={surveyor.surveyorServices ?? []}
            />
          ) : null}
        </View>

        {approvedReviews.length === 0 && pendingReviews.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>এখনও কোনো রিভিউ নেই।</Text>
        ) : null}
        {approvedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
        {pendingReviews.map((review) => (
          <ReviewCard key={review.id} review={review} pending />
        ))}
        {!isAuthenticated && !ownProfile ? (
          <Text style={[styles.loginHint, { color: colors.textMuted }]}>রিভিউ দিতে লগইন করতে হবে।</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 12 },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 9,
    height: 32,
    borderRadius: 8,
  },
  backText: { fontSize: 10.5, fontFamily: Fonts.sansMedium },
  hero: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 13 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarChar: { fontSize: 23, fontFamily: Fonts.headingBold },
  heroInfo: { flex: 1, minWidth: 0 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroName: { flexShrink: 1, fontSize: 18, fontFamily: Fonts.headingBold },
  heroHeadline: { marginTop: 2, fontSize: 11.5, fontFamily: Fonts.sansMedium },
  heroMetaWrap: { marginTop: 6, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flexShrink: 1, fontSize: 10, fontFamily: Fonts.sansRegular },
  ratingPanel: {
    minWidth: 54,
    borderWidth: 1,
    borderRadius: 9,
    padding: 6,
    alignItems: 'center',
  },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNumber: { fontSize: 12, fontFamily: Fonts.headingBold },
  ratingCount: { fontSize: 8.5, fontFamily: Fonts.sansRegular, marginTop: 1 },
  bio: { fontSize: 11.5, fontFamily: Fonts.sansRegular, lineHeight: 18 },
  contactRow: { flexDirection: 'row', gap: 8 },
  sectionCard: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.headingBold },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceName: { fontSize: 11.5, fontFamily: Fonts.sansMedium },
  serviceDescription: {
    marginTop: 2,
    fontSize: 9.5,
    fontFamily: Fonts.sansRegular,
    lineHeight: 14,
  },
  priceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceText: { fontSize: 10.5, fontFamily: Fonts.headingSemiBold },
  emptyText: { fontSize: 10.5, fontFamily: Fonts.sansRegular, lineHeight: 16 },
  areaBlock: { gap: 6, paddingVertical: 4 },
  areaTitle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  areaDistrict: { fontSize: 11.5, fontFamily: Fonts.sansMedium },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  verifiedCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verifiedTitle: { fontSize: 11.5, fontFamily: Fonts.headingBold },
  verifiedText: { marginTop: 2, fontSize: 9.5, lineHeight: 14, fontFamily: Fonts.sansRegular },
  reviewSection: { gap: 8 },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reviewSummary: { marginTop: 1, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  reviewCard: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 6 },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  reviewName: { fontSize: 11.5, fontFamily: Fonts.sansMedium },
  reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  reviewService: { marginLeft: 3, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  reviewComment: { fontSize: 10.5, fontFamily: Fonts.sansRegular, lineHeight: 16 },
  reviewDate: { fontSize: 8.5, fontFamily: Fonts.sansRegular },
  loginHint: { fontSize: 9.5, fontFamily: Fonts.sansRegular },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  stateText: { fontSize: 11, fontFamily: Fonts.sansRegular, textAlign: 'center' },
  errorTitle: { fontSize: 15, fontFamily: Fonts.headingBold },
});
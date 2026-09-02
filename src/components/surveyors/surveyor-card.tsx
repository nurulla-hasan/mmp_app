import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react-native';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { openSurveyorWhatsApp } from '../../lib/contact';
import {
  getSurveyorDisplayName,
  getSurveyorLocation,
  getSurveyorMinimumPrice,
  getSurveyorWhatsApp,
} from '../../lib/surveyor-utils';
import type { TSurveyorProfile } from '../../types/surveyor';
import { toBengaliDigits } from '../../lib/utils';

type Props = { surveyor: TSurveyorProfile; compact?: boolean };

export function SurveyorCard({ surveyor, compact = false }: Props) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const name = getSurveyorDisplayName(surveyor);
  const location = getSurveyorLocation(surveyor);
  const whatsapp = getSurveyorWhatsApp(surveyor);
  const minPrice = getSurveyorMinimumPrice(surveyor);
  const verified = surveyor.isVerified ?? surveyor.verificationStatus === 'APPROVED';
  const rating = Number(surveyor.rating || 0);
  const reviews = Number(surveyor.totalReviews || 0);
  const services = surveyor.surveyorServices ?? [];
  const visibleServices = services.slice(0, compact ? 2 : 3);
  const hiddenServiceCount = Math.max(0, services.length - visibleServices.length);
  const imageUrl = surveyor.user?.imageUrl || surveyor.profilePhoto;

  const openDetails = () => {
    if (!surveyor.slug) return;
    router.push({ pathname: '/surveyors/[slug]', params: { slug: surveyor.slug } });
  };

  const openWhatsApp = async () => {
    try {
      await openSurveyorWhatsApp(whatsapp, name);
    } catch {
      Alert.alert(
        'WhatsApp খোলা যাচ্ছে না',
        'ডিভাইসে WhatsApp বা উপযুক্ত ব্রাউজার পাওয়া যায়নি।',
      );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={openDetails}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.headerRow}>
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
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {name.charAt(0) || 'স'}
            </Text>
          </View>
        )}

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {verified ? <BadgeCheck size={15} color={colors.primary} /> : null}
          </View>

          {surveyor.headline ? (
            <Text
              style={[styles.headline, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {surveyor.headline}
            </Text>
          ) : null}

          <View style={styles.metaWrap}>
            {location.upazila || location.district ? (
              <View style={styles.metaItem}>
                <MapPin size={11} color={colors.primary} />
                <Text
                  style={[styles.metaText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {[location.upazila, location.district].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}

            {(surveyor.experienceYears || 0) > 0 ? (
              <View style={styles.metaItem}>
                <Briefcase size={11} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {toBengaliDigits(surveyor.experienceYears || 0)} বছর
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.ratingBox}>
          {rating > 0 ? (
            <>
              <Star size={11} color='#f59e0b' fill='#f59e0b' />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {toBengaliDigits(rating.toFixed(1))}
              </Text>
              {reviews > 0 ? (
                <Text style={[styles.reviewCount, { color: colors.textMuted }]}>
                  ({toBengaliDigits(reviews)})
                </Text>
              ) : null}
            </>
          ) : (
            <Badge label='নতুন' variant='free' />
          )}
        </View>
      </View>

      {services.length > 0 ? (
        <View style={styles.tagsRow}>
          {visibleServices.map((item) => (
            <Badge key={item.id} label={item.service.name} variant='neutral' />
          ))}
          {hiddenServiceCount > 0 ? (
            <Badge
              label={`+${toBengaliDigits(hiddenServiceCount)} আরও`}
              variant='neutral'
            />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>শুরু</Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {minPrice == null ? 'আলোচনা সাপেক্ষ' : `৳${minPrice.toLocaleString('bn-BD')}`}
          </Text>
        </View>

        <View style={styles.actions}>
          {whatsapp ? (
            <Button
              title={compact ? '' : 'WhatsApp'}
              size={compact ? 'icon' : 'sm'}
              variant='outline'
              onPress={openWhatsApp}
              icon={<MessageCircle size={13} color='#16a34a' />}
              style={{ borderColor: 'rgba(22,163,74,.28)' }}
            />
          ) : null}
          <Button
            title={compact ? '' : 'বিস্তারিত'}
            size={compact ? 'icon' : 'sm'}
            onPress={openDetails}
            icon={<ArrowRight size={12} color='#fff' />}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 11 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: Fonts.headingBold },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: 14, fontFamily: Fonts.headingBold },
  headline: { fontSize: 10.5, fontFamily: Fonts.sansRegular },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '72%' },
  metaText: { fontSize: 10.5, fontFamily: Fonts.sansRegular },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 20 },
  ratingText: { fontSize: 11, fontFamily: Fonts.sansBold },
  reviewCount: { fontSize: 9.5, fontFamily: Fonts.sansRegular },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceLabel: { fontSize: 9.5, fontFamily: Fonts.sansRegular },
  price: { marginTop: 1, fontSize: 12.5, fontFamily: Fonts.headingBold },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});

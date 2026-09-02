import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, BadgeCheck, Briefcase, Clock, LogIn, UserPlus } from 'lucide-react-native';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingSkeleton, useSkeletonPulse } from '../components/ui/loading-skeleton';
import { SurveyorProfileForm } from '../components/surveyors/surveyor-profile-form';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';
import { useSurveyorDistricts, useSurveyorServices } from '../hooks/queries/use-surveyors';
import { useApplyAsSurveyor } from '../hooks/mutations/use-surveyor-mutations';
import { ErrorToast } from '../lib/utils';
import type { SurveyorApplicationPayload } from '../types/surveyor';

type JoinColors = (typeof Colors)['light'];

function ApplicationFormSkeleton({ colors }: { colors: JoinColors }) {
  const opacity = useSkeletonPulse(true);

  return (
    <View style={styles.formSkeleton}>
      <View style={[styles.skeletonBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonBannerIcon} />
        <View style={styles.skeletonGrow}>
          <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonBannerTitle} />
          <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonBannerText} />
        </View>
      </View>

      {[0, 1, 2].map((section) => (
        <View
          key={`join-section-${section}`}
          style={[styles.skeletonSection, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonSectionTitle} />
          <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonInput} />
          <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonInput} />
          {section > 0 ? (
            <View style={styles.skeletonChipRow}>
              <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonChip} />
              <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonChipWide} />
              <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonChip} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function JoinAsSurveyorScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { user, isAuthenticated } = useAuthStore();
  const { data: districts = [], isLoading: districtsLoading } = useSurveyorDistricts();
  const { data: services = [], isLoading: servicesLoading } = useSurveyorServices();
  const applyMutation = useApplyAsSurveyor();
  const profile = user?.surveyorProfile;

  const submitApplication = (payload: SurveyorApplicationPayload) => {
    if (!isAuthenticated) {
      ErrorToast('আবেদন করার জন্য প্রথমে লগইন করুন।');
      router.push('/(auth)/login');
      return;
    }

    applyMutation.mutate(payload);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 14 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>সার্ভেয়ার হিসেবে যোগ দিন</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          আপনার পেশাদার ভূমি জরিপ সেবা নতুন ক্লায়েন্টদের কাছে পৌঁছে দিন।
        </Text>
      </View>

      {profile ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {profile.verificationStatus === 'APPROVED' ? (
            <BadgeCheck size={38} color={colors.primary} />
          ) : profile.verificationStatus === 'REJECTED' ? (
            <AlertTriangle size={38} color='#ef4444' />
          ) : (
            <Clock size={38} color='#d97706' />
          )}

          <Text style={[styles.stateTitle, { color: colors.text }]}>আপনার সার্ভেয়ার আবেদন</Text>
          <Badge
            label={
              profile.verificationStatus === 'APPROVED'
                ? 'অনুমোদিত'
                : profile.verificationStatus === 'REJECTED'
                  ? 'প্রত্যাখ্যাত'
                  : 'যাচাইয়ের অপেক্ষায়'
            }
            variant={profile.verificationStatus === 'APPROVED' ? 'success' : 'warning'}
          />
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            {profile.verificationStatus === 'APPROVED'
              ? 'আপনার প্রোফাইল এখন পাবলিক সার্ভেয়ার ডিরেক্টরিতে সক্রিয়।'
              : profile.verificationStatus === 'REJECTED'
                ? profile.adminNote ||
                  'আবেদনটি অনুমোদন করা হয়নি। বিস্তারিত জানতে সাপোর্টের সাথে যোগাযোগ করুন।'
                : 'অ্যাডমিন আপনার পেশাদার তথ্য ও সনদ যাচাই করছে। অনুমোদনের পর প্রোফাইল ডিরেক্টরিতে দেখা যাবে।'}
          </Text>

          {profile.verificationStatus === 'APPROVED' && user?.role === 'SURVEYOR' ? (
            <View style={styles.actions}>
              <Button
                title='প্রোফাইল এডিট করুন'
                onPress={() => router.push('/surveyor-profile')}
              />
              {profile.slug ? (
                <Button
                  title='পাবলিক প্রোফাইল'
                  variant='outline'
                  onPress={() =>
                    router.push({
                      pathname: '/surveyors/[slug]',
                      params: { slug: profile.slug! },
                    })
                  }
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : districtsLoading || servicesLoading ? (
        <ApplicationFormSkeleton colors={colors} />
      ) : (
        <>
          {!isAuthenticated ? (
            <View
              style={[
                styles.authWarning,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(217,119,6,.10)' : '#fffbeb',
                  borderColor: theme === 'dark' ? 'rgba(217,119,6,.28)' : '#fde68a',
                },
              ]}
            >
              <AlertTriangle size={19} color='#d97706' />
              <View style={styles.warningContent}>
                <Text
                  style={[
                    styles.warningTitle,
                    { color: theme === 'dark' ? '#fbbf24' : '#92400e' },
                  ]}
                >
                  ফর্ম পূরণ করতে পারেন, জমা দেওয়ার আগে লগইন করতে হবে
                </Text>
                <Text
                  style={[
                    styles.warningText,
                    { color: theme === 'dark' ? '#fcd34d' : '#a16207' },
                  ]}
                >
                  আপনার আবেদনটি একটি Mouza Map Pro অ্যাকাউন্টের সাথে যুক্ত হবে।
                </Text>
                <View style={styles.authActions}>
                  <Button
                    title='লগইন'
                    size='sm'
                    variant='outline'
                    onPress={() => router.push('/(auth)/login')}
                    icon={<LogIn size={12} color={colors.text} />}
                  />
                  <Button
                    title='রেজিস্ট্রেশন'
                    size='sm'
                    onPress={() => router.push('/(auth)/register')}
                    icon={<UserPlus size={12} color='#fff' />}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.partnerBanner,
                { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}30` },
              ]}
            >
              <Briefcase size={20} color={colors.primary} />
              <Text style={[styles.partnerText, { color: colors.textMuted }]}>
                পেশাদার তথ্য, সেবা, শুরুর মূল্য ও কাজের এলাকা দিন। অ্যাডমিন যাচাইয়ের
                পর আপনার পাবলিক সার্ভেয়ার প্রোফাইল চালু হবে।
              </Text>
            </View>
          )}

          <SurveyorProfileForm
            mode='apply'
            districts={districts}
            services={services}
            pending={applyMutation.isPending}
            onSubmit={submitApplication}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 38, gap: 14 },
  header: { gap: 3 },
  title: { fontSize: 18, fontFamily: Fonts.headingBold },
  subtitle: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sansRegular },
  stateCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 26,
    alignItems: 'center',
    gap: 9,
  },
  stateTitle: { fontSize: 15, fontFamily: Fonts.headingBold, textAlign: 'center' },
  stateText: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  authWarning: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  warningContent: { flex: 1, gap: 3 },
  warningTitle: { fontSize: 11.5, fontFamily: Fonts.headingSemiBold },
  warningText: { fontSize: 10, lineHeight: 15, fontFamily: Fonts.sansRegular },
  authActions: { flexDirection: 'row', gap: 7, marginTop: 6 },
  partnerBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partnerText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular },
  formSkeleton: { gap: 14 },
  skeletonBanner: { minHeight: 72, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  skeletonBannerIcon: { width: 34, height: 34, borderRadius: 9 },
  skeletonGrow: { flex: 1, gap: 8 },
  skeletonBannerTitle: { width: '54%', height: 12 },
  skeletonBannerText: { width: '86%', height: 9 },
  skeletonSection: { borderWidth: 1, borderRadius: 15, padding: 14, gap: 11 },
  skeletonSectionTitle: { width: '38%', height: 14 },
  skeletonInput: { width: '100%', height: 46, borderRadius: 10 },
  skeletonChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  skeletonChip: { width: 82, height: 28, borderRadius: 7 },
  skeletonChipWide: { width: 118, height: 28, borderRadius: 7 },
});

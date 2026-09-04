import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Clock,
  LogIn,
  UserPlus,
} from 'lucide-react-native';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageWrapper, SectionWrapper } from '../components/common/page-layout';
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
    <PageWrapper keyboardShouldPersistTaps='handled'>
      <SectionWrapper
        style={[
          styles.hero,
          {
            backgroundColor: `${colors.primary}0A`,
            borderColor: `${colors.primary}25`,
          },
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}14` }]}>
          <Briefcase size={20} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>পেশাদার প্রোফাইল তৈরি করুন</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            আপনার সেবা, অভিজ্ঞতা ও কাজের এলাকা যোগ করুন। যাচাই শেষে ক্লায়েন্টরা আপনাকে সহজে খুঁজে পাবে।
          </Text>
        </View>
      </SectionWrapper>

      {profile ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.stateIcon,
              {
                backgroundColor:
                  profile.verificationStatus === 'APPROVED'
                    ? `${colors.primary}12`
                    : profile.verificationStatus === 'REJECTED'
                      ? 'rgba(239,68,68,.10)'
                      : 'rgba(217,119,6,.10)',
              },
            ]}
          >
            {profile.verificationStatus === 'APPROVED' ? (
              <BadgeCheck size={25} color={colors.primary} />
            ) : profile.verificationStatus === 'REJECTED' ? (
              <AlertTriangle size={25} color='#ef4444' />
            ) : (
              <Clock size={25} color='#d97706' />
            )}
          </View>

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
              <AlertTriangle size={18} color='#d97706' />
              <View style={styles.warningContent}>
                <Text
                  style={[
                    styles.warningTitle,
                    { color: theme === 'dark' ? '#fbbf24' : '#92400e' },
                  ]}
                >
                  আবেদন জমা দিতে লগইন প্রয়োজন
                </Text>
                <Text
                  style={[
                    styles.warningText,
                    { color: theme === 'dark' ? '#fcd34d' : '#a16207' },
                  ]}
                >
                  এখন ফর্ম পূরণ করতে পারেন। জমা দেওয়ার সময় আপনার Mouza Map Pro অ্যাকাউন্টে লগইন করুন।
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
          ) : null}

          <SurveyorProfileForm
            mode='apply'
            districts={districts}
            services={services}
            pending={applyMutation.isPending}
            onSubmit={submitApplication}
          />
        </>
      )}
    </PageWrapper>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 16, lineHeight: 21, fontFamily: Fonts.headingBold },
  heroSubtitle: { fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular },
  stateCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningContent: { flex: 1, gap: 3 },
  warningTitle: { fontSize: 11.5, fontFamily: Fonts.headingSemiBold },
  warningText: { fontSize: 10, lineHeight: 15, fontFamily: Fonts.sansRegular },
  authActions: { flexDirection: 'row', gap: 7, marginTop: 6 },
  formSkeleton: { gap: 12 },
  skeletonSection: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10 },
  skeletonSectionTitle: { width: '38%', height: 14 },
  skeletonInput: { width: '100%', height: 46, borderRadius: 10 },
  skeletonChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  skeletonChip: { width: 82, height: 28, borderRadius: 7 },
  skeletonChipWide: { width: 118, height: 28, borderRadius: 7 },
});

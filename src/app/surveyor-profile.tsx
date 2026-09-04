import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/ui/button';
import { PageSectionHeader, PageWrapper } from '../components/common/page-layout';
import { SurveyorProfileForm } from '../components/surveyors/surveyor-profile-form';
import { SurveyorProfileSkeleton } from '../components/common/page-loading-skeletons';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';
import { useMySurveyorProfile, useSurveyorDistricts, useSurveyorServices } from '../hooks/queries/use-surveyors';
import { useUpdateMySurveyorProfile } from '../hooks/mutations/use-surveyor-mutations';

export default function SurveyorProfileScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { user, isAuthenticated } = useAuthStore();
  const profileQuery = useMySurveyorProfile();
  const { data: districts = [] } = useSurveyorDistricts();
  const { data: services = [] } = useSurveyorServices();
  const updateMutation = useUpdateMySurveyorProfile();

  if (!isAuthenticated || user?.role !== 'SURVEYOR') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>সার্ভেয়ার প্রোফাইল পাওয়া যায়নি</Text>
        <Text style={[styles.text, { color: colors.textMuted }]}>এই অংশটি অনুমোদিত সার্ভেয়ারদের জন্য।</Text>
        <Button title='সার্ভেয়ার হিসেবে যোগ দিন' onPress={() => router.replace('/join-as-surveyor')} />
      </View>
    );
  }

  if (profileQuery.isLoading) {
    return <SurveyorProfileSkeleton />;
  }

  if (!profileQuery.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>প্রোফাইল লোড করা যায়নি</Text>
        <Button title='আবার চেষ্টা করুন' onPress={() => profileQuery.refetch()} />
      </View>
    );
  }

  return (
    <PageWrapper keyboardShouldPersistTaps='handled'>
      <PageSectionHeader
        title='সার্ভেয়ার প্রোফাইল ম্যানেজ করুন'
        subtitle='সেবা, মূল্য, এলাকা ও পেশাদার তথ্য আপডেট করুন।'
      />
      <SurveyorProfileForm
        mode='edit'
        districts={districts}
        services={services}
        initialProfile={profileQuery.data}
        pending={updateMutation.isPending}
        onSubmit={(payload) => updateMutation.mutate(payload)}
      />
    </PageWrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 9 },
  title: { fontSize: 17, fontFamily: Fonts.headingBold, textAlign: 'center' },
  text: { marginTop: 2, fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular, textAlign: 'center' },
});

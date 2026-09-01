import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Map,
  MoveDiagonal,
  Scaling,
  Calculator,
  PenLine,
  Ruler,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import { AppHeader } from '../../components/common/app-header';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Navbar Header */}
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.proTag}>
              <Sparkles size={12} color='#22c55e' />
              <Text style={styles.proTagText}>MOUZA MAP PRO</Text>
            </View>
            <Badge label='v2.0 LIVE' variant='pro' />
          </View>

          <Text style={styles.heroTitle}>ডিজিটাল মৌজা ম্যাপ ও জমি পরিমাপ</Text>
          <Text style={styles.heroSubtitle}>
            ম্যাপে সরাসরি দাগ এঁকে শতক, কাঠা ও একরে নিখুঁত ক্ষেত্রফল হিসাব ও সাবেক-হাল ম্যাপ তুলনা করুন।
          </Text>

          <View style={styles.heroActionRow}>
            <Button
              title='ম্যাপে জমি মাপুন'
              size='md'
              onPress={() => router.push('/(tools)/land-measurement')}
              style={styles.heroBtn}
              icon={<Map size={15} color='#fff' />}
            />
            <Button
              title='একক রূপান্তর'
              variant='outline'
              size='md'
              onPress={() => router.push('/(tools)/unit-converter')}
              style={styles.heroBtnOutline}
              textStyle={{ color: '#ffffff' }}
            />
          </View>
        </View>

        {/* Quick Launch Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>জনপ্রিয় টুলস</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tools')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>সব টুলস দেখুন →</Text>
          </TouchableOpacity>
        </View>

        {/* 2x2 Grid of Main Tools */}
        <View style={styles.grid}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.toolCard}
            onPress={() => router.push('/(tools)/land-measurement')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
              <Map size={20} color='#16a34a' />
            </View>
            <View style={styles.toolTextCol}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.toolTitle}>জমি পরিমাপ</Text>
                <Badge label='PRO' variant='pro' />
              </View>
              <Text style={styles.toolDesc}>ম্যাপে দাগ এঁকে শতক হিসাব</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.toolCard}
            onPress={() => router.push('/(tools)/unit-converter')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <MoveDiagonal size={20} color='#2563eb' />
            </View>
            <View style={styles.toolTextCol}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.toolTitle}>একক রূপান্তর</Text>
                <Badge label='ফ্রি' variant='free' />
              </View>
              <Text style={styles.toolDesc}>শতক, কাঠা, বিঘা, একর</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.toolCard}
            onPress={() => router.push('/(tools)/pantagraph')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
              <Scaling size={20} color='#d97706' />
            </View>
            <View style={styles.toolTextCol}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.toolTitle}>প্যান্টাগ্রাফ</Text>
                <Badge label='PRO' variant='pro' />
              </View>
              <Text style={styles.toolDesc}>সাবেক ও হাল ম্যাপ তুলনা</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.toolCard}
            onPress={() => router.push('/(tools)/inheritance')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 29, 72, 0.12)' }]}>
              <Calculator size={20} color='#e11d48' />
            </View>
            <View style={styles.toolTextCol}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.toolTitle}>জমি বণ্টন</Text>
                <Badge label='ফ্রি' variant='free' />
              </View>
              <Text style={styles.toolDesc}>ফারায়েজ ও হিস্যা বণ্টন</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pro Map Tools Teaser List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>এডভান্সড ফিচারস</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tools)/tracer')}
        >
          <Card style={styles.featureRowCard}>
            <View style={[styles.iconBoxSmall, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <PenLine size={18} color='#059669' />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.featureTitle}>ডিজিটাল ম্যাপ ট্রেসিং (Vector Tracer)</Text>
                <Badge label='PRO' variant='pro' />
              </View>
              <Text style={styles.featureDesc}>ঝাপসা ম্যাপ থেকে দাগের সীমানা ও নম্বর নিখুঁত ভেক্টরে ট্রেস করুন।</Text>
            </View>
            <ChevronRight size={16} color='#94a3b8' />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tools)/scale-guide')}
        >
          <Card style={styles.featureRowCard}>
            <View style={[styles.iconBoxSmall, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Ruler size={18} color='#6366f1' />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>মৌজা ম্যাপ স্কেল সেট নির্দেশিকা</Text>
              <Text style={styles.featureDesc}>১৬ ইঞ্চি = ১ মাইল ও কাস্টম স্কেল সেট করার নিয়মাবলী।</Text>
            </View>
            <ChevronRight size={16} color='#94a3b8' />
          </Card>
        </TouchableOpacity>

        {/* Surveyor Connection Banner */}
        <Card style={styles.surveyorBanner}>
          <View style={styles.surveyorBannerLeft}>
            <View style={styles.surveyorIconCircle}>
              <ShieldCheck size={22} color='#16a34a' />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.surveyorBannerTitle}>দক্ষ ডিজিটাল সার্ভেয়ার খুঁজছেন?</Text>
              <Text style={styles.surveyorBannerDesc}>
                আপনার এলাকার অভিজ্ঞ ও ভেরিফাইড আমিনদের সাথে সরাসরি যোগাযোগ করুন।
              </Text>
            </View>
          </View>
          <Button
            title='সার্ভেয়ারদের লিস্ট দেখুন'
            size='sm'
            variant='secondary'
            onPress={() => router.push('/(tabs)/surveyors')}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proTagText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    color: '#94a3b8',
    lineHeight: 18,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroBtn: {
    flex: 1,
  },
  heroBtnOutline: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: Fonts.headingSemiBold,
    color: '#16a34a',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextCol: {
    gap: 2,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolTitle: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  toolDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    lineHeight: 14,
  },
  featureRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  iconBoxSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  featureDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    marginTop: 1,
  },
  surveyorBanner: {
    gap: 10,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 4,
  },
  surveyorBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  surveyorIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyorBannerTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  surveyorBannerDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    lineHeight: 15,
  },
});

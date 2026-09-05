import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Scaling, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageIntro, PageWrapper, SectionWrapper } from '../../components/common/page-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

const PANTAGRAPH_URL = 'https://mouzamappro.com/tools/pantagraph';

const FEATURES = [
  'সিএস, আরএস ও বিএস ম্যাপ পাশাপাশি বা ওভারলে রেখে সুপারইম্পোজ',
  'ম্যাচিং পয়েন্ট বসিয়ে স্বয়ংক্রিয় রোটেট ও স্কেল অ্যাডজাস্টমেন্ট',
  'স্বচ্ছতা (Opacity) কন্ট্রোল করে দাগের পরিবর্তন পর্যবেক্ষণ',
  'সাবেক দাগ থেকে হাল দাগের পরিবর্তন ও দখল সীমানা যাচাই',
];

export default function PantagraphScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const handleLaunch = async () => {
    try {
      await WebBrowser.openBrowserAsync(PANTAGRAPH_URL, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#0f172a',
        controlsColor: '#22c55e',
      });
    } catch {
      await Linking.openURL(PANTAGRAPH_URL);
    }
  };

  return (
    <PageWrapper style={{ backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <PageIntro
        title="ম্যাপ তুলনা ও প্যান্টাগ্রাফ"
        description="সাবেক ও হাল ম্যাপ আপলোড করে matching point বসিয়ে অবস্থান ও স্কেল মিলিয়ে তুলনা করুন"
        icon={<Scaling size={20} color={colors.primary} />}
      />

      <Card
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(22, 163, 74, 0.25)',
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isDark
                ? 'rgba(34, 197, 94, 0.16)'
                : 'rgba(22, 163, 74, 0.12)',
            },
          ]}
        >
          <Scaling size={32} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.cardHeaderWrap}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            ওয়েব প্যান্টাগ্রাফ স্টুডিও
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            পিসি বা ট্যাবলেটের মতো বড় স্ক্রিনের ফুল ফিচারের উন্নত টুল
          </Text>
        </View>

        <View style={styles.featuresList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <CheckCircle2 size={15} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textMuted }]}>{f}</Text>
            </View>
          ))}
        </View>

        <Button
          title="ওয়েব ভার্সনে প্যান্টাগ্রাফ ওপেন করুন"
          size="default"
          variant="primary"
          onPress={handleLaunch}
          icon={<ExternalLink size={16} color="#ffffff" />}
          style={styles.launchBtn}
        />
      </Card>
    </PageWrapper>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 14,
    gap: 16,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderWrap: {
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
  featuresList: {
    width: '100%',
    gap: 10,
    paddingVertical: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    lineHeight: 16,
  },
  launchBtn: {
    width: '100%',
    marginTop: 4,
  },
});

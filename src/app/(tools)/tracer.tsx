import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { PenLine, ExternalLink, CheckCircle2 } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageIntro, PageWrapper } from '../../components/common/page-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

const TRACER_URL = 'https://mouzamappro.com/tools/tracer';

const FEATURES = [
  'ঝাপসা ও পুরনো স্ক্যান করা মৌজা ম্যাপের দাগের সীমানা ভেক্টর ট্রেস',
  'দাগ নম্বর স্বয়ংক্রিয় চিহ্নিতকরণ ও টেক্সট প্লেসমেন্ট',
  'হাই-রেজোলিউশন SVG, DXF, GeoJSON ও PDF ফরম্যাটে এক্সপোর্ট',
  'সঠিক জিওমেট্রি ও প্রিসিশন বাউন্ডারি কার্ভ ড্রয়িং টুলস',
];

export default function TracerScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const handleLaunch = async () => {
    try {
      await WebBrowser.openBrowserAsync(TRACER_URL, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#0f172a',
        controlsColor: '#22c55e',
      });
    } catch {
      await Linking.openURL(TRACER_URL);
    }
  };

  return (
    <PageWrapper style={{ backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <PageIntro
        title="ডিজিটাল ম্যাপ ট্রেসিং"
        description="পুরানো মৌজা ম্যাপ থেকে দাগের সীমানা ও দাগ নম্বর ভেক্টরে ট্রেস করে পরিষ্কার ডিজিটাল ম্যাপ তৈরি করুন"
        icon={<PenLine size={20} color={colors.primary} />}
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
          <PenLine size={32} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.cardHeaderWrap}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            ওয়েব ডিজিটাল ট্রেসার স্টুডিও
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            পিসি বা ব্রাউজারে ভেক্টর আর্ট ও ক্যাড সমমানের অ্যাডভান্সড ট্রেসিং
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
          title="ওয়েব ভার্সনে ট্রেসার ওপেন করুন"
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

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Info,
  Map as MapIcon,
  Ruler,
  Scale,
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import {
  PAGE_LAYOUT,
  PageSectionHeader,
  PageWrapper,
  SectionWrapper,
} from '../../components/common/page-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';

type ThemeColors = (typeof Colors)['light'];

type StepProps = {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  colors: ThemeColors;
  note?: string;
};

const QUICK_REFERENCES = [
  { label: '১ চেইন', value: '৬৬ ft' },
  { label: '১০ চেইন', value: '৬৬০ ft' },
  { label: '১০০ লিংক', value: '৬৬ ft' },
  { label: '১ মাইল', value: '৫২৮০ ft' },
];

function CalibrationDiagram({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.diagram,
        {
          backgroundColor: `${colors.primary}08`,
          borderColor: `${colors.primary}24`,
        },
      ]}
    >
      <Svg width='100%' height={126} viewBox='0 0 320 126'>
        <Line x1='46' y1='66' x2='274' y2='66' stroke={colors.primary} strokeWidth='4' />
        <Circle cx='46' cy='66' r='11' fill={colors.card} stroke={colors.primary} strokeWidth='3' />
        <Circle cx='274' cy='66' r='11' fill={colors.card} stroke={colors.primary} strokeWidth='3' />

        <Line x1='46' y1='28' x2='46' y2='96' stroke={colors.textMuted} strokeWidth='1.2' strokeDasharray='4 4' />
        <Line x1='274' y1='28' x2='274' y2='96' stroke={colors.textMuted} strokeWidth='1.2' strokeDasharray='4 4' />

        <Path d='M 62 49 L 46 49 L 53 43 M 46 49 L 53 55' stroke={colors.textMuted} strokeWidth='1.6' fill='none' />
        <Path d='M 258 49 L 274 49 L 267 43 M 274 49 L 267 55' stroke={colors.textMuted} strokeWidth='1.6' fill='none' />
        <Line x1='62' y1='49' x2='258' y2='49' stroke={colors.textMuted} strokeWidth='1.6' />

        <SvgText x='160' y='39' fontSize='12' fontWeight='700' fill={colors.text} textAnchor='middle'>
          660 ft (10 chains)
        </SvgText>
        <SvgText x='46' y='112' fontSize='10' fontWeight='700' fill={colors.primary} textAnchor='middle'>
          Point 1
        </SvgText>
        <SvgText x='274' y='112' fontSize='10' fontWeight='700' fill={colors.primary} textAnchor='middle'>
          Point 2
        </SvgText>
      </Svg>

      <View style={[styles.diagramFormula, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.diagramFormulaLabel, { color: colors.textMuted }]}>MMP যেটা হিসাব করে</Text>
        <Text style={[styles.diagramFormulaValue, { color: colors.text }]}>Pixel distance ÷ Real distance = px/ft</Text>
      </View>
    </View>
  );
}

function GuideStep({ number, title, description, icon, colors, note }: StepProps) {
  return (
    <SectionWrapper style={styles.stepCard}>
      <View style={styles.stepTopRow}>
        <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}14` }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary }]}>{number}</Text>
        </View>
        <View style={[styles.stepIcon, { backgroundColor: `${colors.primary}0D` }]}>{icon}</View>
        <View style={styles.stepCopy}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.stepDescription, { color: colors.textMuted }]}>{description}</Text>
        </View>
      </View>

      {note ? (
        <View style={[styles.stepNote, { backgroundColor: `${colors.primary}09` }]}>
          <CheckCircle2 size={14} color={colors.primary} />
          <Text style={[styles.stepNoteText, { color: colors.text }]}>{note}</Text>
        </View>
      ) : null}
    </SectionWrapper>
  );
}

export default function ScaleGuideScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const iconScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const iconOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  return (
    <PageWrapper>
      <SectionWrapper
        style={[
          styles.hero,
          {
            backgroundColor: theme === 'dark' ? 'rgba(34,197,94,0.07)' : '#f0fdf4',
            borderColor: theme === 'dark' ? 'rgba(34,197,94,0.22)' : '#bbf7d0',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.heroIcon,
            { backgroundColor: `${colors.primary}14`, opacity: iconOpacity, transform: [{ scale: iconScale }] },
          ]}
        >
          <Scale size={27} color={colors.primary} strokeWidth={2.2} />
        </Animated.View>

        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: colors.primary }]}>SCALE CALIBRATION</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>আগে স্কেল সেট করুন, তারপর দাগ মাপুন</Text>
          <Text style={[styles.heroDescription, { color: colors.textMuted }]}>
            ম্যাপের দুইটি পরিচিত পয়েন্টের বাস্তব দূরত্ব দিয়ে MMP-কে শেখান—ম্যাপের কত pixel বাস্তবে কত ফুট। এরপর সব দৈর্ঘ্য ও ক্ষেত্রফল সেই স্কেলেই হিসাব হবে।
          </Text>
        </View>

        <CalibrationDiagram colors={colors} />
      </SectionWrapper>

      <PageSectionHeader
        title='অ্যাপে যেভাবে স্কেল সেট করবেন'
        subtitle='Map → Scale → 2 Points → Known Distance → Set Scale'
      />

      <View style={styles.steps}>
        <GuideStep
          number='১'
          title='ম্যাপ যোগ করুন'
          description='Land Measurement খুলে নিচের toolbar থেকে “Map” চাপুন এবং মৌজা ম্যাপের ছবি/PDF page যোগ করুন।'
          note='স্কেল সেট করার আগে ম্যাপ অবশ্যই লোড থাকতে হবে।'
          icon={<MapIcon size={19} color={colors.primary} />}
          colors={colors}
        />

        <GuideStep
          number='২'
          title='“Scale” চাপুন এবং দুই প্রান্ত ধরুন'
          description='Toolbar-এর “Scale” চাপুন। ম্যাপ zoom/pan করে মাঝের crosshair-টি পরিচিত লাইনের প্রথম প্রান্তে নিন, “Point” চাপুন; তারপর দ্বিতীয় প্রান্তে নিয়ে আবার “Point” চাপুন।'
          note='দুইটি Point দেওয়ার পর Known Distance box নিজে থেকেই খুলবে।'
          icon={<Crosshair size={19} color={colors.primary} />}
          colors={colors}
        />

        <GuideStep
          number='৩'
          title='বাস্তব দূরত্ব ফুটে লিখুন'
          description='যে দুই পয়েন্ট ধরেছেন তাদের বাস্তব দূরত্ব লিখুন। যেমন ১০ চেইন হলে ৬৬০ ft। চাইলে preset থেকেও নির্বাচন করতে পারবেন।'
          note='১ chain = ৬৬ ft • ১০০ links = ১ chain'
          icon={<Ruler size={19} color={colors.primary} />}
          colors={colors}
        />

        <GuideStep
          number='৪'
          title='“Set Scale” দিন, তারপর Draw করুন'
          description='Set Scale চাপলেই MMP pixel-to-feet ratio সংরক্ষণ করবে। এবার toolbar-এর “Draw” সক্রিয় হবে এবং প্লট মাপা শুরু করতে পারবেন।'
          note='স্কেল পরিবর্তন করলে আগের plotted measurement reset হতে পারে—তাই শুরুতেই scale ঠিক করুন।'
          icon={<CheckCircle2 size={19} color={colors.primary} />}
          colors={colors}
        />
      </View>

      <PageSectionHeader title='দ্রুত রেফারেন্স' subtitle='Known distance লিখতে সবচেয়ে কাজে লাগবে' />

      <View style={styles.referenceGrid}>
        {QUICK_REFERENCES.map((item) => (
          <View
            key={item.label}
            style={[styles.referenceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.referenceLabel, { color: colors.textMuted }]}>{item.label}</Text>
            <Text style={[styles.referenceValue, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <SectionWrapper
        style={[
          styles.infoCard,
          {
            backgroundColor: theme === 'dark' ? 'rgba(59,130,246,0.08)' : '#eff6ff',
            borderColor: theme === 'dark' ? 'rgba(96,165,250,0.22)' : '#bfdbfe',
          },
        ]}
      >
        <View style={styles.infoHeader}>
          <Info size={18} color={theme === 'dark' ? '#60a5fa' : '#2563eb'} />
          <Text style={[styles.infoTitle, { color: colors.text }]}>“১৬″ = ১ মাইল” লেখা থাকলেই কি scale ready?</Text>
        </View>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          না। Phone-এ import করার পরে image/PDF-এর pixel size, crop ও resolution বদলাতে পারে। তাই printed scale জানলেও অ্যাপে পরিচিত একটি line ধরে calibration করাই বেশি নির্ভরযোগ্য।
        </Text>
      </SectionWrapper>

      <SectionWrapper style={styles.manualCard}>
        <View style={styles.manualHeader}>
          <View style={[styles.manualIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ruler size={18} color={colors.primary} />
          </View>
          <View style={styles.manualCopy}>
            <Text style={[styles.manualTitle, { color: colors.text }]}>Feet per pixel আগে থেকেই জানলে</Text>
            <Text style={[styles.manualText, { color: colors.textMuted }]}>
              Scale mode-এ “Manual” চাপুন এবং ft/px লিখুন। যেমন 0.125 ft/px মানে ৮ pixel = ১ foot।
            </Text>
          </View>
        </View>
      </SectionWrapper>

      <Button
        title='ল্যান্ড মেজারমেন্ট খুলে স্কেল সেট করুন'
        size='lg'
        onPress={() => router.push('/(tools)/land-measurement')}
        icon={<ArrowRight size={16} color='#fff' />}
        style={styles.cta}
      />
    </PageWrapper>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 16,
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  heroCopy: { alignItems: 'center', gap: 4 },
  heroEyebrow: {
    fontSize: 9.5,
    letterSpacing: 1.1,
    fontFamily: Fonts.headingBold,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
  heroDescription: {
    maxWidth: 520,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
  diagram: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 9,
    overflow: 'hidden',
  },
  diagramFormula: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 1,
  },
  diagramFormulaLabel: {
    fontSize: 9,
    fontFamily: Fonts.sansRegular,
  },
  diagramFormulaValue: {
    fontSize: 10.5,
    fontFamily: Fonts.headingSemiBold,
  },
  steps: { gap: PAGE_LAYOUT.gap },
  stepCard: { gap: PAGE_LAYOUT.compactGap },
  stepTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1, gap: 3 },
  stepTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontFamily: Fonts.headingBold,
  },
  stepDescription: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
  },
  stepNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  stepNoteText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 14,
    fontFamily: Fonts.sansMedium,
  },
  referenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PAGE_LAYOUT.compactGap,
  },
  referenceCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  referenceLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
  },
  referenceValue: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
  },
  infoCard: { gap: 7 },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  infoTitle: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: Fonts.headingBold,
  },
  infoText: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
  },
  manualCard: { gap: 0 },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  manualIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCopy: { flex: 1, gap: 2 },
  manualTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  manualText: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
  },
  cta: {
    minHeight: 42,
    marginTop: 2,
    borderRadius: 10,
  },
});

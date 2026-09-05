import React, { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Layers,
  Ruler,
  Sparkles,
  X,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import {
  PageIntro,
  PageSectionHeader,
  PageWrapper,
  SectionWrapper,
} from '../../components/common/page-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import {
  convertFromSqFeet,
  convertToSqFeet,
  type LandUnitKey,
} from '../../lib/calculations';
import { useThemeStore } from '../../stores/theme-store';

type UnitOption = {
  key: LandUnitKey;
  label: string;
  shortLabel: string;
  subLabel: string;
  category: 'primary' | 'traditional' | 'metric';
};

const UNITS: UnitOption[] = [
  { key: 'shotok', label: 'শতক / শতাংশ', shortLabel: 'শতক', subLabel: '৪৩৫.৬ বর্গফুট', category: 'primary' },
  { key: 'katha', label: 'কাঠা', shortLabel: 'কাঠা', subLabel: '৭২০ বর্গফুট (১.৬৫ শতক)', category: 'primary' },
  { key: 'bigha', label: 'বিঘা', shortLabel: 'বিঘা', subLabel: '১৪,৪০০ বর্গফুট (২০ কাঠা)', category: 'primary' },
  { key: 'acre', label: 'একর', shortLabel: 'একর', subLabel: '৪৩,৫৬০ বর্গফুট (১০০ শতক)', category: 'primary' },
  { key: 'hectare', label: 'হেক্টর', shortLabel: 'হেক্টর', subLabel: '২.৪৭ একর (২৪৭.১ শতক)', category: 'metric' },
  { key: 'sqFeet', label: 'বর্গফুট (Sq Ft)', shortLabel: 'বর্গফুট', subLabel: '১ স্কয়ার ফিট', category: 'metric' },
  { key: 'sqMeter', label: 'বর্গমিটার (Sq M)', shortLabel: 'বর্গমিটার', subLabel: '১০.৭৬৪ বর্গফুট', category: 'metric' },
  { key: 'sqYard', label: 'বর্গগজ (Sq Yard)', shortLabel: 'বর্গগজ', subLabel: '৯ বর্গফুট', category: 'metric' },
  { key: 'kani', label: 'কানি (শাহী)', shortLabel: 'কানি', subLabel: '৪০ শতক (১৭,২৮০ বর্গফুট)', category: 'traditional' },
  { key: 'gonda', label: 'গণ্ডা', shortLabel: 'গণ্ডা', subLabel: '২ শতক (৮৬৪ বর্গফুট)', category: 'traditional' },
  { key: 'chhotak', label: 'ছটাক', shortLabel: 'ছটাক', subLabel: '৪৫ বর্গফুট (১/১৬ কাঠা)', category: 'traditional' },
];

const PRESETS = ['১', '৫', '১০', '২০', '৩৩', '৫০', '১০০'];

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '০';
  if (num === 0) return '০';
  if (num < 0.0001 && num > 0) return num.toExponential(2);
  return num.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    useGrouping: true,
  });
}

export default function UnitConverterScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const [value, setValue] = useState('1');
  const [activeUnit, setActiveUnit] = useState<LandUnitKey>('shotok');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(true);

  const numVal = useMemo(() => {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [value]);

  const sqFeet = useMemo(() => convertToSqFeet(numVal, activeUnit), [numVal, activeUnit]);
  const results = useMemo(() => convertFromSqFeet(sqFeet), [sqFeet]);

  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  }, []);

  const activeUnitInfo = UNITS.find((u) => u.key === activeUnit) ?? UNITS[0];

  return (
    <PageWrapper
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Page Intro ─── */}
      <PageIntro
        title="জমির একক রূপান্তর"
        description="শতক, কাঠা, বিঘা, একর, হেক্টর ও বর্গফুটে তাৎক্ষণিক সঠিক হিসাব"
        icon={<ArrowRightLeft size={20} color={colors.primary} />}
      />

      {/* ─── Input & Unit Selector Section ─── */}
      <SectionWrapper style={styles.inputSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            ইনপুট একক নির্বাচন করুন:
          </Text>
          <View
            style={[
              styles.selectedUnitPill,
              {
                backgroundColor: isDark
                  ? 'rgba(34, 197, 94, 0.16)'
                  : 'rgba(22, 163, 74, 0.12)',
              },
            ]}
          >
            <Text style={[styles.selectedUnitPillText, { color: colors.primary }]}>
              {activeUnitInfo.label}
            </Text>
          </View>
        </View>

        {/* Unit Selector Pills */}
        <View style={styles.pillWrap}>
          {UNITS.map((u) => {
            const isActive = activeUnit === u.key;
            return (
              <TouchableOpacity
                key={u.key}
                activeOpacity={0.7}
                style={[
                  styles.unitPill,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : isDark
                      ? 'rgba(30, 41, 59, 0.7)'
                      : '#ffffff',
                    borderColor: isActive
                      ? colors.primary
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#e2e8f0',
                  },
                ]}
                onPress={() => {
                  setActiveUnit(u.key);
                  Keyboard.dismiss();
                }}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    {
                      color: isActive
                        ? '#ffffff'
                        : isDark
                        ? '#cbd5e1'
                        : '#475569',
                      fontFamily: isActive ? Fonts.headingBold : Fonts.headingMedium,
                    },
                  ]}
                >
                  {u.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Main Numeric Input Box */}
        <View style={styles.inputBoxContainer}>
          <Text style={[styles.inputHeadingLabel, { color: colors.text }]}>
            জমির পরিমাণ:
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(22, 163, 74, 0.4)',
              },
            ]}
          >
            <TextInput
              style={[
                styles.numericInput,
                {
                  color: colors.text,
                },
              ]}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setValue(cleaned);
              }}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              selectTextOnFocus
            />

            {value.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.clearBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
                onPress={() => setValue('')}
              >
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.unitSuffixBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(22, 163, 74, 0.12)',
                },
              ]}
            >
              <Text style={[styles.unitSuffixText, { color: colors.primary }]}>
                {activeUnitInfo.shortLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Value Presets */}
        <View style={styles.presetsRow}>
          <Text style={[styles.presetLabel, { color: colors.textMuted }]}>
            কুইক ইনপুট:
          </Text>
          <View style={styles.presetButtons}>
            {PRESETS.map((p) => {
              const isSelected = value === p;
              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.7}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#1e293b'
                        : '#f1f5f9',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#334155'
                        : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setValue(p)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      {
                        color: isSelected
                          ? '#ffffff'
                          : isDark
                          ? '#cbd5e1'
                          : '#475569',
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SectionWrapper>

      {/* ─── Featured Primary Units Grid ─── */}
      <PageSectionHeader
        title="প্রধান ৪টি এককে ফলাফল"
        subtitle="সবচেয়ে বেশি ব্যবহৃত ভূমি এককসমূহের সরাসরি হিসাব"
        icon={<Sparkles size={16} color={colors.primary} />}
      />

      <View style={styles.gridContainer}>
        {/* Shotok */}
        <Card
          style={[
            styles.gridCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: activeUnit === 'shotok' ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.gridCardHeader}>
            <Text style={[styles.gridUnitTitle, { color: colors.text }]}>শতক / শতাংশ</Text>
            <TouchableOpacity
              onPress={() => handleCopy(`${results.shotok} শতক`, 'shotok')}
              style={styles.copyIconButton}
            >
              {copiedKey === 'shotok' ? (
                <Check size={14} color={colors.primary} />
              ) : (
                <Copy size={14} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.gridValue, { color: colors.primary }]}
          >
            {formatNumber(results.shotok)}
          </Text>
          <Text style={[styles.gridSubText, { color: colors.textMuted }]}>
            ১ শতক = ৪৩৫.৬ বর্গফুট
          </Text>
        </Card>

        {/* Katha */}
        <Card
          style={[
            styles.gridCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: activeUnit === 'katha' ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.gridCardHeader}>
            <Text style={[styles.gridUnitTitle, { color: colors.text }]}>কাঠা</Text>
            <TouchableOpacity
              onPress={() => handleCopy(`${results.katha} কাঠা`, 'katha')}
              style={styles.copyIconButton}
            >
              {copiedKey === 'katha' ? (
                <Check size={14} color={colors.primary} />
              ) : (
                <Copy size={14} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.gridValue, { color: colors.primary }]}
          >
            {formatNumber(results.katha)}
          </Text>
          <Text style={[styles.gridSubText, { color: colors.textMuted }]}>
            ১ কাঠা = ১.৬৫ শতক
          </Text>
        </Card>

        {/* Bigha */}
        <Card
          style={[
            styles.gridCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: activeUnit === 'bigha' ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.gridCardHeader}>
            <Text style={[styles.gridUnitTitle, { color: colors.text }]}>বিঘা</Text>
            <TouchableOpacity
              onPress={() => handleCopy(`${results.bigha} বিঘা`, 'bigha')}
              style={styles.copyIconButton}
            >
              {copiedKey === 'bigha' ? (
                <Check size={14} color={colors.primary} />
              ) : (
                <Copy size={14} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.gridValue, { color: colors.primary }]}
          >
            {formatNumber(results.bigha)}
          </Text>
          <Text style={[styles.gridSubText, { color: colors.textMuted }]}>
            ১ বিঘা = ২০ কাঠা
          </Text>
        </Card>

        {/* Acre */}
        <Card
          style={[
            styles.gridCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: activeUnit === 'acre' ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.gridCardHeader}>
            <Text style={[styles.gridUnitTitle, { color: colors.text }]}>একর</Text>
            <TouchableOpacity
              onPress={() => handleCopy(`${results.acre} একর`, 'acre')}
              style={styles.copyIconButton}
            >
              {copiedKey === 'acre' ? (
                <Check size={14} color={colors.primary} />
              ) : (
                <Copy size={14} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.gridValue, { color: colors.primary }]}
          >
            {formatNumber(results.acre)}
          </Text>
          <Text style={[styles.gridSubText, { color: colors.textMuted }]}>
            ১ একর = ১০০ শতক
          </Text>
        </Card>
      </View>

      {/* ─── Detailed Breakdown for All Units ─── */}
      <PageSectionHeader
        title="সকল এককের বিস্তারিত তালিকা"
        subtitle="আন্তর্জাতিক, মেট্রিক ও ঐতিহ্যবাহী আঞ্চলিক এককসমূহ"
        icon={<Layers size={16} color={colors.primary} />}
      />

      <Card
        style={[
          styles.breakdownCard,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        {/* Sq Feet */}
        <BreakdownRow
          name="বর্গফুট (Sq. Feet)"
          value={`${formatNumber(results.sqFeet)} স্কয়ার ফিট`}
          sub="১ বর্গফুট"
          isCopied={copiedKey === 'sqFeet'}
          onCopy={() => handleCopy(`${results.sqFeet} বর্গফুট`, 'sqFeet')}
          theme={theme}
        />

        {/* Sq Meter */}
        <BreakdownRow
          name="বর্গমিটার (Sq. Meter)"
          value={`${formatNumber(results.sqMeter)} বর্গমিটার`}
          sub="১০.৭৬৪ বর্গফুট"
          isCopied={copiedKey === 'sqMeter'}
          onCopy={() => handleCopy(`${results.sqMeter} বর্গমিটার`, 'sqMeter')}
          theme={theme}
        />

        {/* Sq Yard */}
        <BreakdownRow
          name="বর্গগজ (Sq. Yard)"
          value={`${formatNumber(results.sqYard)} বর্গগজ`}
          sub="৯ বর্গফুট"
          isCopied={copiedKey === 'sqYard'}
          onCopy={() => handleCopy(`${results.sqYard} বর্গগজ`, 'sqYard')}
          theme={theme}
        />

        {/* Hectare */}
        <BreakdownRow
          name="হেক্টর (Hectare)"
          value={`${formatNumber(results.hectare)} হেক্টর`}
          sub="২.৪৭১ একর (২৪৭.১ শতক)"
          isCopied={copiedKey === 'hectare'}
          onCopy={() => handleCopy(`${results.hectare} হেক্টর`, 'hectare')}
          theme={theme}
        />

        {/* Kani */}
        <BreakdownRow
          name="শাহী কানি (Kani)"
          value={`${formatNumber(results.kani)} কানি`}
          sub="৪০ শতক (১৭,২৮০ বর্গফুট)"
          isCopied={copiedKey === 'kani'}
          onCopy={() => handleCopy(`${results.kani} কানি`, 'kani')}
          theme={theme}
        />

        {/* Gonda */}
        <BreakdownRow
          name="গণ্ডা (Gonda)"
          value={`${formatNumber(results.gonda)} গণ্ডা`}
          sub="২ শতক (৮৬৪ বর্গফুট)"
          isCopied={copiedKey === 'gonda'}
          onCopy={() => handleCopy(`${results.gonda} গণ্ডা`, 'gonda')}
          theme={theme}
        />

        {/* Chhotak */}
        <BreakdownRow
          name="ছটাক (Chhotak)"
          value={`${formatNumber(results.chhotak)} ছটাক`}
          sub="৪৫ বর্গফুট (১/১৬ কাঠা)"
          isCopied={copiedKey === 'chhotak'}
          onCopy={() => handleCopy(`${results.chhotak} ছটাক`, 'chhotak')}
          theme={theme}
          isLast
        />
      </Card>

      {/* ─── Reference Standard Guide ─── */}
      <SectionWrapper
        style={[
          styles.guideSection,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.guideHeader}
          onPress={() => setIsGuideOpen(!isGuideOpen)}
        >
          <View style={styles.guideTitleRow}>
            <View
              style={[
                styles.guideIconBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(34, 197, 94, 0.16)'
                    : 'rgba(22, 163, 74, 0.1)',
                },
              ]}
            >
              <Info size={15} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.guideTitle, { color: colors.text }]}>
                ভূমি পরিমাপের প্রমিত সূত্রাবলি
              </Text>
              <Text style={[styles.guideSubtitle, { color: colors.textMuted }]}>
                বাংলাদেশে প্রচলিত জরিপ ও পরিমাপ মানদণ্ড
              </Text>
            </View>
          </View>
          {isGuideOpen ? (
            <ChevronUp size={18} color={colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {isGuideOpen && (
          <View style={styles.guideContent}>
            <View
              style={[
                styles.guideDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            />
            <GuideItem label="১ শতক / ডেসিমেল" desc="৪৩৫.৬০ বর্গফুট = ৪৩.৫৬ বর্গগজ = ৪০.৪৬ বর্গমিটার" theme={theme} />
            <GuideItem label="১ কাঠা" desc="৭২০.০০ বর্গফুট = ১.৬৫ শতক = ১৬ ছটাক" theme={theme} />
            <GuideItem label="১ বিঘা" desc="১৪,৪০০.০০ বর্গফুট = ২০ কাঠা = ৩৩.০৬ শতক" theme={theme} />
            <GuideItem label="১ একর" desc="৪৩,৫৬০.০০ বর্গফুট = ১০০ শতক = ৩ বিঘা ৮ ছটাক" theme={theme} />
            <GuideItem label="১ হেক্টর" desc="২.৪৭ একর = ২৪৭.১০ শতক = ১০,০০০ বর্গমিটার" theme={theme} />
            <GuideItem label="১ কানি (শাহী)" desc="৪০ শতক = ২০ গণ্ডা = ১৭,২৮০ বর্গফুট" theme={theme} />
            <GuideItem label="১ গণ্ডা" desc="৪ কড়া = ২ শতক = ৮৬৪ বর্গফুট" theme={theme} />
            <GuideItem label="১ কড়া" desc="৩ ক্রান্তি = ০.৫০ শতক = ২১৬ বর্গফুট" theme={theme} />
            <GuideItem label="১ ক্রান্তি" desc="২০ তিল = ৭২ বর্গফুট" theme={theme} isLast />
          </View>
        )}
      </SectionWrapper>
    </PageWrapper>
  );
}

function BreakdownRow({
  name,
  value,
  sub,
  isCopied,
  onCopy,
  theme,
  isLast = false,
}: {
  name: string;
  value: string;
  sub: string;
  isCopied: boolean;
  onCopy: () => void;
  theme: 'light' | 'dark';
  isLast?: boolean;
}) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <View
      style={[
        styles.breakdownRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: isDark
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
    >
      <View style={styles.breakdownLeft}>
        <Text style={[styles.breakdownName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.breakdownSub, { color: colors.textMuted }]}>{sub}</Text>
      </View>

      <View style={styles.breakdownRight}>
        <Text style={[styles.breakdownValue, { color: colors.text }]}>{value}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCopy}
          style={[
            styles.rowCopyBtn,
            {
              backgroundColor: isCopied
                ? isDark
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(22, 163, 74, 0.12)'
                : isDark
                ? '#1e293b'
                : '#f1f5f9',
            },
          ]}
        >
          {isCopied ? (
            <Check size={12} color={colors.primary} />
          ) : (
            <Copy size={12} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GuideItem({
  label,
  desc,
  theme,
  isLast = false,
}: {
  label: string;
  desc: string;
  theme: 'light' | 'dark';
  isLast?: boolean;
}) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <View
      style={[
        styles.guideItem,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: isDark
            ? 'rgba(255, 255, 255, 0.04)'
            : 'rgba(0, 0, 0, 0.04)',
        },
      ]}
    >
      <View style={styles.guideItemDot} />
      <View style={styles.guideItemCopy}>
        <Text style={[styles.guideItemLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.guideItemDesc, { color: colors.textMuted }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.headingSemiBold,
  },
  selectedUnitPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedUnitPillText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitPillText: {
    fontSize: 11.5,
  },
  inputBoxContainer: {
    gap: 6,
  },
  inputHeadingLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  numericInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSuffixBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitSuffixText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  presetLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard: {
    width: '48.8%',
    padding: 12,
    gap: 4,
    borderRadius: 12,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridUnitTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  copyIconButton: {
    padding: 3,
  },
  gridValue: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    marginVertical: 2,
  },
  gridSubText: {
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
  },
  breakdownCard: {
    padding: 6,
    borderRadius: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  breakdownLeft: {
    flex: 1,
    gap: 1.5,
  },
  breakdownName: {
    fontSize: 12.5,
    fontFamily: Fonts.headingSemiBold,
  },
  breakdownSub: {
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownValue: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
  },
  rowCopyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideSection: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
  },
  guideSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  guideDivider: {
    height: 1,
    marginVertical: 4,
  },
  guideContent: {
    gap: 6,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  guideItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16a34a',
    marginTop: 6,
  },
  guideItemCopy: {
    flex: 1,
    gap: 1,
  },
  guideItemLabel: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
  },
  guideItemDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
});

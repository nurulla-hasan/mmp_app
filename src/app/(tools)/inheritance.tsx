import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowRightLeft,
  Calculator,
  Check,
  ChevronRight,
  Copy,
  Info,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  User,
  Users,
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
import { type LandUnitKey } from '../../lib/calculations';
import {
  calculateIslamicInheritance,
  convertAnnaToFraction,
  type FaraezCalculationInput,
  type HeirResult,
} from '../../lib/faraez-calculator';
import { useThemeStore } from '../../stores/theme-store';

type Mode = 'faraez' | 'anna' | 'custom';

type AnnaShareItem = {
  id: string;
  name: string;
  anna: string;
  gonda: string;
  kora: string;
  kranti: string;
  til: string;
};

type CustomShareItem = {
  id: string;
  name: string;
  ratio: string;
};

const UNITS: { key: LandUnitKey; label: string }[] = [
  { key: 'shotok', label: 'শতক' },
  { key: 'katha', label: 'কাঠা' },
  { key: 'bigha', label: 'বিঘা' },
  { key: 'acre', label: 'একর' },
  { key: 'sqFeet', label: 'বর্গফুট' },
];

function formatNum(n: number, decimals = 4): string {
  if (!Number.isFinite(n) || n === 0) return '০';
  return n.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
}

export default function InheritanceScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const [mode, setMode] = useState<Mode>('faraez');
  const [totalLandStr, setTotalLandStr] = useState('33');
  const [unit, setUnit] = useState<LandUnitKey>('shotok');
  const [copied, setCopied] = useState(false);

  // ─── Faraez State ───
  const [deceasedGender, setDeceasedGender] = useState<'male' | 'female'>('male');
  const [wivesCount, setWivesCount] = useState(1);
  const [hasHusband, setHasHusband] = useState(true);
  const [father, setFather] = useState(true);
  const [mother, setMother] = useState(true);
  const [sonsCount, setSonsCount] = useState(2);
  const [daughtersCount, setDaughtersCount] = useState(1);
  const [brothersCount, setBrothersCount] = useState(0);
  const [sistersCount, setSistersCount] = useState(0);

  // ─── 16 Anna Share State ───
  const [annaItems, setAnnaItems] = useState<AnnaShareItem[]>([
    { id: '1', name: 'অংশীদার ১', anna: '৮', gonda: '০', kora: '০', kranti: '০', til: '০' },
    { id: '2', name: 'অংশীদার ২', anna: '৮', gonda: '০', kora: '০', kranti: '০', til: '০' },
  ]);

  // ─── Custom Ratio State ───
  const [customItems, setCustomItems] = useState<CustomShareItem[]>([
    { id: '1', name: 'অংশীদার ১', ratio: '৫০' },
    { id: '2', name: 'অংশীদার ২', ratio: '৫০' },
  ]);

  const totalLand = useMemo(() => {
    const val = parseFloat(totalLandStr.replace(/,/g, ''));
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }, [totalLandStr]);

  const activeUnitLabel = UNITS.find((u) => u.key === unit)?.label ?? 'শতক';

  // ─── Faraez Result Computation ───
  const faraezResult = useMemo(() => {
    const input: FaraezCalculationInput = {
      deceasedGender,
      totalLand,
      unit,
      wivesCount: deceasedGender === 'male' ? wivesCount : 0,
      husband: deceasedGender === 'female' ? hasHusband : false,
      father,
      mother,
      sonsCount,
      daughtersCount,
      brothersCount,
      sistersCount,
    };
    return calculateIslamicInheritance(input);
  }, [
    deceasedGender,
    totalLand,
    unit,
    wivesCount,
    hasHusband,
    father,
    mother,
    sonsCount,
    daughtersCount,
    brothersCount,
    sistersCount,
  ]);

  // ─── 16 Anna Result Computation ───
  const annaResults = useMemo(() => {
    return annaItems.map((item) => {
      const a = parseFloat(item.anna) || 0;
      const g = parseFloat(item.gonda) || 0;
      const k = parseFloat(item.kora) || 0;
      const kr = parseFloat(item.kranti) || 0;
      const t = parseFloat(item.til) || 0;

      const fraction = convertAnnaToFraction(a, g, k, kr, t);
      const personLand = totalLand * fraction;
      const percentage = fraction * 100;

      return {
        ...item,
        fraction,
        percentage,
        land: personLand,
      };
    });
  }, [annaItems, totalLand]);

  const totalAnnaPercentage = useMemo(
    () => annaResults.reduce((sum, r) => sum + r.percentage, 0),
    [annaResults]
  );

  // ─── Custom Ratio Result Computation ───
  const customResults = useMemo(() => {
    const totalRatio = customItems.reduce(
      (sum, item) => sum + (parseFloat(item.ratio) || 0),
      0
    );
    return customItems.map((item) => {
      const r = parseFloat(item.ratio) || 0;
      const fraction = totalRatio > 0 ? r / totalRatio : 0;
      const personLand = totalLand * fraction;
      const percentage = fraction * 100;
      return {
        ...item,
        percentage,
        land: personLand,
      };
    });
  }, [customItems, totalLand]);

  // ─── Copy Full Report ───
  const handleCopyReport = useCallback(async () => {
    let reportText = `📋 জমি বণ্টন রিপোর্ট (মৌজা ম্যাপ প্রো)\n`;
    reportText += `মোট জমি: ${totalLand} ${activeUnitLabel}\n\n`;

    if (mode === 'faraez') {
      reportText += `বণ্টন পদ্ধতি: ইসলামিক ফারায়েজ (মুসলিম উত্তরাধিকার আইন)\n`;
      reportText += `মৃত ব্যক্তি: ${deceasedGender === 'male' ? 'পুরুষ' : 'নারী'}\n`;
      reportText += `-----------------------------------------\n`;
      faraezResult.heirs.forEach((h, idx) => {
        reportText += `${idx + 1}. ${h.relation}: ${h.individualShareFraction} -> ${formatNum(h.individualLand)} ${activeUnitLabel} (${h.individualPercentage.toFixed(2)}%)\n`;
      });
      reportText += `-----------------------------------------\n`;
      reportText += `মোট বণ্টিত জমি: ${formatNum(faraezResult.totalDistributedLand)} ${activeUnitLabel} (${faraezResult.totalDistributedPercentage}%)\n`;
      if (faraezResult.remainingLand > 0) {
        reportText += `অবশিষ্ট জমি: ${formatNum(faraezResult.remainingLand)} ${activeUnitLabel}\n`;
      }
    } else if (mode === 'anna') {
      reportText += `বণ্টন পদ্ধতি: খতিয়ান ১৬ আনা হিস্যা\n`;
      reportText += `-----------------------------------------\n`;
      annaResults.forEach((r, idx) => {
        reportText += `${idx + 1}. ${r.name || `অংশীদার ${idx + 1}`}: ${r.anna}আ ${r.gonda}গ ${r.kora}কড়া ${r.kranti}ক্রা ${r.til}তিল -> ${formatNum(r.land)} ${activeUnitLabel} (${r.percentage.toFixed(2)}%)\n`;
      });
    } else {
      reportText += `বণ্টন পদ্ধতি: সাধারণ অনুপাত / পার্সেন্টেজ\n`;
      reportText += `-----------------------------------------\n`;
      customResults.forEach((r, idx) => {
        reportText += `${idx + 1}. ${r.name || `অংশীদার ${idx + 1}`}: ${formatNum(r.land)} ${activeUnitLabel} (${r.percentage.toFixed(2)}%)\n`;
      });
    }

    try {
      await Clipboard.setStringAsync(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('কপি সম্পন্ন হয়েছে', 'পূর্ণাঙ্গ বণ্টন রিপোর্ট ক্লিপবোর্ডে কপি করা হয়েছে।');
    } catch {}
  }, [
    mode,
    totalLand,
    activeUnitLabel,
    deceasedGender,
    faraezResult,
    annaResults,
    customResults,
  ]);

  return (
    <PageWrapper
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Page Intro ─── */}
      <PageIntro
        title="জমি বণ্টন ক্যালকুলেটর"
        description="ফারায়েজ শরিয়াহ্ আইন, খতিয়ানের ১৬ আনা হিস্যা ও সাধারণ অংশীদার বণ্টন"
        icon={<Calculator size={20} color={colors.primary} />}
      />

      {/* ─── Mode Switcher Tabs ─── */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: isDark ? '#111827' : '#e2e8f0',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabBtn,
            mode === 'faraez' && [
              styles.tabBtnActive,
              { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
            ],
          ]}
          onPress={() => setMode('faraez')}
        >
          <Text
            style={[
              styles.tabBtnText,
              {
                color: mode === 'faraez' ? colors.primary : colors.textMuted,
                fontFamily: mode === 'faraez' ? Fonts.headingBold : Fonts.headingMedium,
              },
            ]}
          >
            ফারায়েজ বণ্টন
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabBtn,
            mode === 'anna' && [
              styles.tabBtnActive,
              { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
            ],
          ]}
          onPress={() => setMode('anna')}
        >
          <Text
            style={[
              styles.tabBtnText,
              {
                color: mode === 'anna' ? colors.primary : colors.textMuted,
                fontFamily: mode === 'anna' ? Fonts.headingBold : Fonts.headingMedium,
              },
            ]}
          >
            ১৬ আনা হিস্যা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabBtn,
            mode === 'custom' && [
              styles.tabBtnActive,
              { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
            ],
          ]}
          onPress={() => setMode('custom')}
        >
          <Text
            style={[
              styles.tabBtnText,
              {
                color: mode === 'custom' ? colors.primary : colors.textMuted,
                fontFamily: mode === 'custom' ? Fonts.headingBold : Fonts.headingMedium,
              },
            ]}
          >
            সাধারণ বণ্টন
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Total Land Input Section ─── */}
      <SectionWrapper style={styles.landInputSection}>
        <View style={styles.landInputHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            বণ্টনযোগ্য মোট জমির পরিমাণ:
          </Text>
          {/* Unit Selector */}
          <View style={styles.unitPillsRow}>
            {UNITS.map((u) => {
              const isSelected = unit === u.key;
              return (
                <TouchableOpacity
                  key={u.key}
                  style={[
                    styles.unitPill,
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
                  onPress={() => setUnit(u.key)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      {
                        color: isSelected ? '#ffffff' : colors.textMuted,
                        fontFamily: isSelected ? Fonts.headingBold : Fonts.headingMedium,
                      },
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.inputFieldBox,
            {
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(22, 163, 74, 0.4)',
            },
          ]}
        >
          <TextInput
            style={[styles.mainInput, { color: colors.text }]}
            keyboardType="decimal-pad"
            value={totalLandStr}
            onChangeText={(t) => setTotalLandStr(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
          <View
            style={[
              styles.unitBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(34, 197, 94, 0.18)'
                  : 'rgba(22, 163, 74, 0.12)',
              },
            ]}
          >
            <Text style={[styles.unitBadgeText, { color: colors.primary }]}>
              {activeUnitLabel}
            </Text>
          </View>
        </View>
      </SectionWrapper>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── TAB 1: FARAEZ MODE CONTROLS ─── */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'faraez' && (
        <>
          <SectionWrapper style={styles.faraezSection}>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              মৃত ব্যক্তির তথ্যাবলি ও ওয়ারিশ নির্বাচন করুন:
            </Text>

            {/* Deceased Gender Selector */}
            <View style={styles.genderRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                মৃত ব্যক্তি:
              </Text>
              <View style={styles.genderButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    deceasedGender === 'male' && [
                      styles.genderBtnActive,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                    ],
                    deceasedGender !== 'male' && {
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setDeceasedGender('male')}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      { color: deceasedGender === 'male' ? '#ffffff' : colors.textMuted },
                    ]}
                  >
                    পুরুষ (স্বামী/পিতা)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    deceasedGender === 'female' && [
                      styles.genderBtnActive,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                    ],
                    deceasedGender !== 'female' && {
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setDeceasedGender('female')}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      { color: deceasedGender === 'female' ? '#ffffff' : colors.textMuted },
                    ]}
                  >
                    নারী (স্ত্রী/মাতা)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Spouse Selector */}
            {deceasedGender === 'male' ? (
              <CounterRow
                label="জীবিত স্ত্রী (Wives)"
                count={wivesCount}
                max={4}
                onChange={setWivesCount}
                theme={theme}
              />
            ) : (
              <ToggleRow
                label="জীবিত স্বামী (Husband)"
                active={hasHusband}
                onToggle={() => setHasHusband(!hasHusband)}
                theme={theme}
              />
            )}

            {/* Parents */}
            <ToggleRow
              label="জীবিত পিতা (Father)"
              active={father}
              onToggle={() => setFather(!father)}
              theme={theme}
            />
            <ToggleRow
              label="জীবিত মাতা (Mother)"
              active={mother}
              onToggle={() => setMother(!mother)}
              theme={theme}
            />

            {/* Children */}
            <CounterRow
              label="জীবিত পুত্র (Sons)"
              count={sonsCount}
              max={20}
              onChange={setSonsCount}
              theme={theme}
            />
            <CounterRow
              label="জীবিত কন্যা (Daughters)"
              count={daughtersCount}
              max={20}
              onChange={setDaughtersCount}
              theme={theme}
            />

            {/* Siblings (if no sons) */}
            {sonsCount === 0 && (
              <>
                <CounterRow
                  label="জীবিত ভাই (Brothers)"
                  count={brothersCount}
                  max={15}
                  onChange={setBrothersCount}
                  theme={theme}
                />
                <CounterRow
                  label="জীবিত বোন (Sisters)"
                  count={sistersCount}
                  max={15}
                  onChange={setSistersCount}
                  theme={theme}
                />
              </>
            )}
          </SectionWrapper>

          {/* Faraez Results */}
          <PageSectionHeader
            title="ফারায়েজ অনুযায়ী বণ্টন ফলাফল"
            subtitle={faraezResult.formulaSummary}
            icon={<Users size={16} color={colors.primary} />}
            action={
              <TouchableOpacity
                style={[
                  styles.copyReportBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.16)'
                      : 'rgba(22, 163, 74, 0.12)',
                  },
                ]}
                onPress={handleCopyReport}
              >
                {copied ? (
                  <Check size={13} color={colors.primary} />
                ) : (
                  <Copy size={13} color={colors.primary} />
                )}
                <Text style={[styles.copyReportText, { color: colors.primary }]}>
                  {copied ? 'কপি হয়েছে' : 'রিপোর্ট কপি'}
                </Text>
              </TouchableOpacity>
            }
          />

          <Card
            style={[
              styles.resultCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {faraezResult.heirs.map((heir, idx) => (
              <View
                key={heir.id}
                style={[
                  styles.heirRow,
                  idx !== faraezResult.heirs.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <View style={styles.heirLeft}>
                  <View style={styles.heirTitleRow}>
                    <Text style={[styles.heirRelation, { color: colors.text }]}>
                      {heir.relation}
                    </Text>
                    <View
                      style={[
                        styles.fractionBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(34, 197, 94, 0.16)'
                            : 'rgba(22, 163, 74, 0.1)',
                        },
                      ]}
                    >
                      <Text style={[styles.fractionText, { color: colors.primary }]}>
                        {heir.individualShareFraction}
                      </Text>
                    </View>
                  </View>
                  {heir.note && (
                    <Text style={[styles.heirNote, { color: colors.textMuted }]}>
                      {heir.note}
                    </Text>
                  )}
                  {heir.count > 1 && (
                    <Text style={[styles.eachPersonText, { color: colors.primary }]}>
                      প্রত্যেকে পাবে: {formatNum(heir.individualLand)} {activeUnitLabel} (
                      {heir.individualPercentage.toFixed(2)}%)
                    </Text>
                  )}
                </View>

                <View style={styles.heirRight}>
                  <Text style={[styles.heirTotalLand, { color: colors.primary }]}>
                    {formatNum(heir.totalLand)} {activeUnitLabel}
                  </Text>
                  <Text style={[styles.heirPercentage, { color: colors.textMuted }]}>
                    মোট: {heir.totalPercentage.toFixed(2)}%
                  </Text>
                </View>
              </View>
            ))}

            {/* Total Footer */}
            <View
              style={[
                styles.totalFooterRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text style={[styles.totalFooterLabel, { color: colors.text }]}>
                মোট বণ্টনকৃত জমি:
              </Text>
              <Text style={[styles.totalFooterValue, { color: colors.primary }]}>
                {formatNum(faraezResult.totalDistributedLand)} {activeUnitLabel} (
                {faraezResult.totalDistributedPercentage}%)
              </Text>
            </View>
          </Card>
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── TAB 2: 16 ANNA KHATIAN SHARE MODE ─── */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'anna' && (
        <>
          <SectionWrapper style={styles.faraezSection}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                খতিয়ানের আনা, গণ্ডা, কড়া, ক্রান্তি ও তিল দিন:
              </Text>
              <TouchableOpacity
                style={[
                  styles.addPartnerBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.18)'
                      : 'rgba(22, 163, 74, 0.12)',
                  },
                ]}
                onPress={() => {
                  setAnnaItems([
                    ...annaItems,
                    {
                      id: String(Date.now()),
                      name: `অংশীদার ${annaItems.length + 1}`,
                      anna: '০',
                      gonda: '০',
                      kora: '০',
                      kranti: '০',
                      til: '০',
                    },
                  ]);
                }}
              >
                <Plus size={13} color={colors.primary} />
                <Text style={[styles.addPartnerBtnText, { color: colors.primary }]}>
                  অংশীদার যোগ
                </Text>
              </TouchableOpacity>
            </View>

            {/* Anna Rows */}
            {annaItems.map((item, idx) => (
              <Card
                key={item.id}
                style={[
                  styles.annaItemCard,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.annaCardTop}>
                  <TextInput
                    style={[styles.partnerNameInput, { color: colors.text }]}
                    value={item.name}
                    onChangeText={(text) => {
                      const next = [...annaItems];
                      next[idx].name = text;
                      setAnnaItems(next);
                    }}
                    placeholder={`অংশীদার ${idx + 1}`}
                    placeholderTextColor={colors.textMuted}
                  />

                  {annaItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        setAnnaItems(annaItems.filter((_, i) => i !== idx));
                      }}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sub Inputs: Anna, Gonda, Kora, Kranti, Til */}
                <View style={styles.annaInputGrid}>
                  <AnnaSubInput
                    label="আনা (০-১৬)"
                    value={item.anna}
                    onChange={(v) => {
                      const next = [...annaItems];
                      next[idx].anna = v;
                      setAnnaItems(next);
                    }}
                    theme={theme}
                  />
                  <AnnaSubInput
                    label="গণ্ডা (০-১৯)"
                    value={item.gonda}
                    onChange={(v) => {
                      const next = [...annaItems];
                      next[idx].gonda = v;
                      setAnnaItems(next);
                    }}
                    theme={theme}
                  />
                  <AnnaSubInput
                    label="কড়া (০-৩)"
                    value={item.kora}
                    onChange={(v) => {
                      const next = [...annaItems];
                      next[idx].kora = v;
                      setAnnaItems(next);
                    }}
                    theme={theme}
                  />
                  <AnnaSubInput
                    label="ক্রান্তি (০-২)"
                    value={item.kranti}
                    onChange={(v) => {
                      const next = [...annaItems];
                      next[idx].kranti = v;
                      setAnnaItems(next);
                    }}
                    theme={theme}
                  />
                  <AnnaSubInput
                    label="তিল (০-১৯)"
                    value={item.til}
                    onChange={(v) => {
                      const next = [...annaItems];
                      next[idx].til = v;
                      setAnnaItems(next);
                    }}
                    theme={theme}
                  />
                </View>

                {/* Land Computed for this partner */}
                <View style={styles.annaComputedRow}>
                  <Text style={[styles.annaComputedLabel, { color: colors.textMuted }]}>
                    জমির হিস্যা: {annaResults[idx]?.percentage.toFixed(2)}%
                  </Text>
                  <Text style={[styles.annaComputedValue, { color: colors.primary }]}>
                    {formatNum(annaResults[idx]?.land || 0)} {activeUnitLabel}
                  </Text>
                </View>
              </Card>
            ))}
          </SectionWrapper>

          {/* Anna Summary */}
          <PageSectionHeader
            title="খতিয়ান হিস্যা ফলাফল"
            subtitle={`মোট হিস্যা: ${totalAnnaPercentage.toFixed(2)}% (${
              totalAnnaPercentage === 100
                ? '১৬ আনা পূর্ণ'
                : `${(16 * (totalAnnaPercentage / 100)).toFixed(2)} আনা`
            })`}
            icon={<Users size={16} color={colors.primary} />}
            action={
              <TouchableOpacity
                style={[
                  styles.copyReportBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.16)'
                      : 'rgba(22, 163, 74, 0.12)',
                  },
                ]}
                onPress={handleCopyReport}
              >
                {copied ? (
                  <Check size={13} color={colors.primary} />
                ) : (
                  <Copy size={13} color={colors.primary} />
                )}
                <Text style={[styles.copyReportText, { color: colors.primary }]}>
                  {copied ? 'কপি হয়েছে' : 'রিপোর্ট কপি'}
                </Text>
              </TouchableOpacity>
            }
          />
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── TAB 3: CUSTOM RATIO / PERCENTAGE MODE ─── */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'custom' && (
        <>
          <SectionWrapper style={styles.faraezSection}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                অংশীদারদের নাম ও অনুপাত / শতাংশ (%) দিন:
              </Text>
              <TouchableOpacity
                style={[
                  styles.addPartnerBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.18)'
                      : 'rgba(22, 163, 74, 0.12)',
                  },
                ]}
                onPress={() => {
                  setCustomItems([
                    ...customItems,
                    {
                      id: String(Date.now()),
                      name: `অংশীদার ${customItems.length + 1}`,
                      ratio: '০',
                    },
                  ]);
                }}
              >
                <Plus size={13} color={colors.primary} />
                <Text style={[styles.addPartnerBtnText, { color: colors.primary }]}>
                  অংশীদার যোগ
                </Text>
              </TouchableOpacity>
            </View>

            {customItems.map((item, idx) => (
              <View key={item.id} style={styles.customRow}>
                <TextInput
                  style={[
                    styles.customNameInput,
                    {
                      color: colors.text,
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  value={item.name}
                  onChangeText={(text) => {
                    const next = [...customItems];
                    next[idx].name = text;
                    setCustomItems(next);
                  }}
                  placeholder={`অংশীদার ${idx + 1}`}
                  placeholderTextColor={colors.textMuted}
                />

                <View
                  style={[
                    styles.customRatioWrap,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.customRatioInput, { color: colors.text }]}
                    keyboardType="numeric"
                    value={item.ratio}
                    onChangeText={(text) => {
                      const next = [...customItems];
                      next[idx].ratio = text.replace(/[^0-9.]/g, '');
                      setCustomItems(next);
                    }}
                    placeholder="ভাগ / %"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.customPercentSign, { color: colors.textMuted }]}>
                    ভাগ
                  </Text>
                </View>

                {customItems.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      setCustomItems(customItems.filter((_, i) => i !== idx));
                    }}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </SectionWrapper>

          {/* Custom Results */}
          <PageSectionHeader
            title="আনুপাতিক বণ্টন ফলাফল"
            subtitle="নির্ধারিত অনুপাত অনুযায়ী প্রত্যেকের প্রাপ্য জমি"
            icon={<Users size={16} color={colors.primary} />}
            action={
              <TouchableOpacity
                style={[
                  styles.copyReportBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.16)'
                      : 'rgba(22, 163, 74, 0.12)',
                  },
                ]}
                onPress={handleCopyReport}
              >
                {copied ? (
                  <Check size={13} color={colors.primary} />
                ) : (
                  <Copy size={13} color={colors.primary} />
                )}
                <Text style={[styles.copyReportText, { color: colors.primary }]}>
                  {copied ? 'কপি হয়েছে' : 'রিপোর্ট কপি'}
                </Text>
              </TouchableOpacity>
            }
          />

          <Card
            style={[
              styles.resultCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {customResults.map((res, idx) => (
              <View
                key={res.id}
                style={[
                  styles.heirRow,
                  idx !== customResults.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <View style={styles.heirLeft}>
                  <Text style={[styles.heirRelation, { color: colors.text }]}>
                    {res.name || `অংশীদার ${idx + 1}`}
                  </Text>
                  <Text style={[styles.heirNote, { color: colors.textMuted }]}>
                    অনুপাত: {res.ratio} ভাগ ({res.percentage.toFixed(2)}%)
                  </Text>
                </View>

                <View style={styles.heirRight}>
                  <Text style={[styles.heirTotalLand, { color: colors.primary }]}>
                    {formatNum(res.land)} {activeUnitLabel}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ─── Standard Laws & Reference Footer ─── */}
      <SectionWrapper
        style={[
          styles.lawsGuideCard,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.guideTitleRow}>
          <Info size={15} color={colors.primary} />
          <Text style={[styles.guideMainTitle, { color: colors.text }]}>
            ফারায়েজ ও উত্তরাধিকার আইনের মূল নীতিমালা
          </Text>
        </View>
        <Text style={[styles.guideTextP, { color: colors.textMuted }]}>
          • <Text style={{ fontFamily: Fonts.headingBold, color: colors.text }}>স্ত্রী:</Text>{' '}
          সন্তান থাকলে ১/৮ (১২.৫%), সন্তান না থাকলে ১/৪ (২৫%)। একাধিক স্ত্রী থাকলে সমভাবে ভাগ।
        </Text>
        <Text style={[styles.guideTextP, { color: colors.textMuted }]}>
          • <Text style={{ fontFamily: Fonts.headingBold, color: colors.text }}>স্বামী:</Text>{' '}
          সন্তান থাকলে ১/৪ (২৫%), সন্তান না থাকলে ১/২ (৫০%)।
        </Text>
        <Text style={[styles.guideTextP, { color: colors.textMuted }]}>
          • <Text style={{ fontFamily: Fonts.headingBold, color: colors.text }}>পিতা ও মাতা:</Text>{' '}
          সন্তান থাকলে প্রত্যেকে ১/৬ অংশ পায়।
        </Text>
        <Text style={[styles.guideTextP, { color: colors.textMuted }]}>
          • <Text style={{ fontFamily: Fonts.headingBold, color: colors.text }}>পুত্র ও কন্যা:</Text>{' '}
          পুত্র কন্যার দ্বিগুণ (২:১ অনুপাত) পায়। পুত্র ছাড়া শুধু ১ কন্যা থাকলে ১/২, একাধিক কন্যা থাকলে ২/৩ অংশ পায়।
        </Text>
      </SectionWrapper>
    </PageWrapper>
  );
}

// ─── Helper Components ───

function CounterRow({
  label,
  count,
  max,
  onChange,
  theme,
}: {
  label: string;
  count: number;
  max: number;
  onChange: (n: number) => void;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <View style={styles.counterRow}>
      <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepperWrap}>
        <TouchableOpacity
          style={[
            styles.stepperBtn,
            {
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
          ]}
          onPress={() => onChange(Math.max(0, count - 1))}
          disabled={count <= 0}
        >
          <Minus size={14} color={count > 0 ? colors.text : colors.textMuted} />
        </TouchableOpacity>

        <View
          style={[
            styles.stepperDisplay,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: count > 0 ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.stepperText,
              { color: count > 0 ? colors.primary : colors.textMuted },
            ]}
          >
            {count}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.stepperBtn,
            {
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
          ]}
          onPress={() => onChange(Math.min(max, count + 1))}
        >
          <Plus size={14} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  active,
  onToggle,
  theme,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <View style={styles.counterRow}>
      <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.togglePill,
          {
            backgroundColor: active
              ? colors.primary
              : isDark
              ? '#1e293b'
              : '#f1f5f9',
            borderColor: active
              ? colors.primary
              : isDark
              ? '#334155'
              : '#e2e8f0',
          },
        ]}
        onPress={onToggle}
      >
        <Text
          style={[
            styles.toggleText,
            { color: active ? '#ffffff' : colors.textMuted },
          ]}
        >
          {active ? 'হ্যাঁ (বিদ্যমান)' : 'না (মৃত/অনুপস্থিত)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AnnaSubInput({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  return (
    <View style={styles.subInputBox}>
      <Text style={[styles.subInputLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.subInputField,
          {
            color: colors.text,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: colors.cardBorder,
          },
        ]}
        keyboardType="numeric"
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
  },
  landInputSection: {
    gap: 10,
  },
  landInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  unitPillText: {
    fontSize: 11,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  mainInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    paddingVertical: 0,
  },
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitBadgeText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
  },
  faraezSection: {
    gap: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.headingSemiBold,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  genderButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  genderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  genderBtnActive: {},
  genderBtnText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  counterLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.headingSemiBold,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplay: {
    width: 34,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  copyReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  copyReportText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  resultCard: {
    padding: 6,
    borderRadius: 12,
  },
  heirRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  heirLeft: {
    flex: 1,
    gap: 2,
  },
  heirTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heirRelation: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
  },
  fractionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  fractionText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
  },
  heirNote: {
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
  },
  eachPersonText: {
    fontSize: 10.5,
    fontFamily: Fonts.headingBold,
  },
  heirRight: {
    alignItems: 'flex-end',
    gap: 1.5,
  },
  heirTotalLand: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
  },
  heirPercentage: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  totalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  totalFooterLabel: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
  },
  totalFooterValue: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
  },
  addPartnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addPartnerBtnText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
  },
  annaItemCard: {
    padding: 10,
    gap: 8,
    borderRadius: 10,
  },
  annaCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerNameInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    paddingVertical: 0,
  },
  deleteBtn: {
    padding: 4,
  },
  annaInputGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  subInputBox: {
    flex: 1,
    gap: 2,
  },
  subInputLabel: {
    fontSize: 9,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
  },
  subInputField: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    textAlign: 'center',
  },
  annaComputedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  annaComputedLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  annaComputedValue: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customNameInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
    fontFamily: Fonts.headingSemiBold,
  },
  customRatioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 90,
  },
  customRatioInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    paddingVertical: 0,
  },
  customPercentSign: {
    fontSize: 10,
    fontFamily: Fonts.sansRegular,
  },
  lawsGuideCard: {
    padding: 12,
    gap: 6,
    borderRadius: 12,
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  guideMainTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  guideTextP: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Fonts.sansRegular,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpDown, Award, MapPin, RotateCcw, SlidersHorizontal, Star, X } from 'lucide-react-native';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useModalSafeBottomPadding } from '../common/keyboard-safe-layout';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import type { DistrictOption, SurveyorQuery, TSurveyorService } from '../../types/surveyor';

type FilterState = Pick<SurveyorQuery, 'district' | 'service' | 'rating' | 'experienceMin' | 'sortBy'>;

type Props = {
  visible: boolean;
  value: FilterState;
  districts: DistrictOption[];
  services: TSurveyorService[];
  totalResults?: number;
  onClose: () => void;
  onApply: (value: FilterState) => void;
};

const EXPERIENCE = [
  { label: 'সকল', value: undefined },
  { label: '২+ বছর', value: 2 },
  { label: '৫+ বছর', value: 5 },
  { label: '১০+ বছর', value: 10 },
  { label: '১৫+ বছর', value: 15 },
] as const;

const SORT = [
  { label: 'সুপারিশকৃত', value: undefined },
  { label: 'সর্বোচ্চ রেটিং', value: 'rating_desc' },
  { label: 'বেশি অভিজ্ঞতা', value: 'experience_desc' },
  { label: 'নতুন সদস্য', value: 'newest' },
] as const;

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}18` : colors.card },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.primary : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SurveyorFilterModal({ visible, value, districts, services, totalResults, onClose, onApply }: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const footerBottomPadding = useModalSafeBottomPadding(12);
  const [draft, setDraft] = useState<FilterState>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const activeCount = useMemo(
    () => [draft.district, draft.service, draft.rating, draft.experienceMin, draft.sortBy].filter(Boolean).length,
    [draft]
  );

  const reset = () => setDraft({});

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <SlidersHorizontal size={17} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>ফিল্টার ও বাছাই</Text>
                {activeCount > 0 ? <Badge label={`${activeCount}`} variant='pro' /> : null}
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>ওয়েবের একই filter contract ব্যবহার করা হচ্ছে</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={19} color={colors.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeCount > 0 ? (
              <View style={[styles.resetRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.smallText, { color: colors.textMuted }]}>ফিল্টার সক্রিয় আছে</Text>
                <TouchableOpacity onPress={reset} style={styles.resetBtn}>
                  <RotateCcw size={12} color='#ef4444' />
                  <Text style={styles.resetText}>সব রিসেট</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.labelRow}><MapPin size={14} color={colors.primary} /><Text style={[styles.label, { color: colors.text }]}>সেবার জেলা</Text></View>
              <View style={styles.wrap}>
                <Chip label='সকল জেলা' active={!draft.district} onPress={() => setDraft((p) => ({ ...p, district: undefined }))} />
                {districts.map((item) => (
                  <Chip key={item.value} label={item.label} active={draft.district === item.value} onPress={() => setDraft((p) => ({ ...p, district: p.district === item.value ? undefined : item.value }))} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>সেবাসমূহ</Text>
              <View style={styles.wrap}>
                <Chip label='সকল সেবা' active={!draft.service} onPress={() => setDraft((p) => ({ ...p, service: undefined }))} />
                {services.map((item) => (
                  <Chip key={item.id} label={item.name} active={draft.service === item.slug} onPress={() => setDraft((p) => ({ ...p, service: p.service === item.slug ? undefined : item.slug }))} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}><Star size={14} color='#f59e0b' /><Text style={[styles.label, { color: colors.text }]}>সর্বনিম্ন রেটিং</Text></View>
              <View style={styles.wrap}>
                <Chip label='যে কোনো' active={!draft.rating} onPress={() => setDraft((p) => ({ ...p, rating: undefined }))} />
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Chip key={rating} label={`${rating}+ ★`} active={Number(draft.rating) === rating} onPress={() => setDraft((p) => ({ ...p, rating: Number(p.rating) === rating ? undefined : rating }))} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}><Award size={14} color={colors.primary} /><Text style={[styles.label, { color: colors.text }]}>কাজের অভিজ্ঞতা</Text></View>
              <View style={styles.wrap}>
                {EXPERIENCE.map((item) => (
                  <Chip key={item.label} label={item.label} active={item.value === undefined ? !draft.experienceMin : Number(draft.experienceMin) === item.value} onPress={() => setDraft((p) => ({ ...p, experienceMin: item.value }))} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}><ArrowUpDown size={14} color={colors.primary} /><Text style={[styles.label, { color: colors.text }]}>সাজানোর ক্রম</Text></View>
              <View style={styles.wrap}>
                {SORT.map((item) => (
                  <Chip key={item.label} label={item.label} active={item.value === undefined ? !draft.sortBy : draft.sortBy === item.value} onPress={() => setDraft((p) => ({ ...p, sortBy: item.value }))} />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: footerBottomPadding }]}>
            <Text style={[styles.smallText, { color: colors.textMuted }]}>{totalResults == null ? '' : `${totalResults} জন পাওয়া গেছে`}</Text>
            <Button title='ফলাফল দেখুন' size='md' onPress={() => { onApply(draft); onClose(); }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 15.5, fontFamily: Fonts.headingBold },
  subtitle: { fontSize: 10, fontFamily: Fonts.sansRegular, marginTop: 2 },
  closeBtn: { padding: 5 },
  content: { padding: 14, gap: 18, paddingBottom: 24 },
  resetRow: { borderWidth: 1, borderRadius: 9, padding: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { fontSize: 10.5, color: '#ef4444', fontFamily: Fonts.sansMedium },
  section: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, fontFamily: Fonts.headingSemiBold },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 10.5, fontFamily: Fonts.sansMedium },
  footer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  smallText: { fontSize: 10.5, fontFamily: Fonts.sansRegular },
});

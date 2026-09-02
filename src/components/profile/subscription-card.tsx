import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock, Crown, Sparkles } from 'lucide-react-native';
import { Badge } from '../ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useMySubscription } from '../../hooks/queries/use-subscriptions';

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function SubscriptionCard({ onPress }: { onPress: () => void }) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const query = useMySubscription();
  const active = query.data?.activeSubscription;
  const pending = query.data?.pendingSubscription;

  const title = active?.plan?.name || pending?.plan?.name || 'Free Access';
  const description = active
    ? `সক্রিয় • মেয়াদ শেষ ${formatDate(active.endDate)}`
    : pending
      ? `পেমেন্ট যাচাইাধীন • TrxID ${pending.transactionId}`
      : 'Pro tools ও advanced workflow আনলক করুন';

  const Icon = active ? Crown : pending ? Clock : Sparkles;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={[styles.iconBox, { backgroundColor: active ? `${colors.primary}16` : pending ? 'rgba(217,119,6,.12)' : `${colors.primary}0D` }]}>
        {query.isLoading ? (
          <ActivityIndicator size='small' color={colors.primary} />
        ) : (
          <Icon size={18} color={active ? colors.primary : pending ? '#d97706' : colors.primary} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {active ? <Badge label='PRO সক্রিয়' variant='success' /> : pending ? <Badge label='Pending' variant='warning' /> : <Badge label='ফ্রি' variant='free' />}
        </View>
        <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <ChevronRight size={17} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  title: { fontSize: 12.5, fontFamily: Fonts.headingBold },
  description: { fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sansRegular },
});

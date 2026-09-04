import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Info,
  Pin,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import type { BroadcastType, TBroadcast } from '../../types/broadcast';

const WEB_TO_APP_ROUTES: Record<string, string> = {
  '/tools': '/(tabs)/tools',
  '/tools/land-measurement': '/(tools)/land-measurement',
  '/tools/mouza-map-studio': '/(tools)/land-measurement',
  '/tools/mouza-geo-studio': '/(tools)/land-measurement',
  '/tools/pantagraph': '/(tools)/pantagraph',
  '/tools/tracer': '/(tools)/tracer',
  '/tools/unit-converter': '/(tools)/unit-converter',
  '/tools/inheritance-calculator': '/(tools)/inheritance',
  '/tools/scale-guide': '/(tools)/scale-guide',
  '/surveyors': '/(tabs)/surveyors',
  '/pricing': '/pricing',
  '/join-as-surveyor': '/join-as-surveyor',
};

function typeConfig(type: BroadcastType) {
  switch (type) {
    case 'PROMO':
      return {
        label: 'Special Announcement',
        Icon: Sparkles,
        color: '#16a34a',
        background: 'rgba(22,163,74,.10)',
        border: 'rgba(22,163,74,.25)',
      };
    case 'WARNING':
      return {
        label: 'Important Notice',
        Icon: AlertTriangle,
        color: '#d97706',
        background: 'rgba(217,119,6,.10)',
        border: 'rgba(217,119,6,.25)',
      };
    case 'MAINTENANCE':
      return {
        label: 'Maintenance Notice',
        Icon: Wrench,
        color: '#dc2626',
        background: 'rgba(220,38,38,.09)',
        border: 'rgba(220,38,38,.24)',
      };
    case 'INFO':
    default:
      return {
        label: 'Announcement',
        Icon: Info,
        color: '#2563eb',
        background: 'rgba(37,99,235,.09)',
        border: 'rgba(37,99,235,.22)',
      };
  }
}

function mapInternalRoute(linkUrl: string) {
  const queryIndex = linkUrl.indexOf('?');
  const path = queryIndex >= 0 ? linkUrl.slice(0, queryIndex) : linkUrl;
  const query = queryIndex >= 0 ? linkUrl.slice(queryIndex) : '';
  return `${WEB_TO_APP_ROUTES[path] ?? path}${query}`;
}

function formatBroadcastDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  broadcasts: TBroadcast[];
  loading?: boolean;
};

export function BroadcastCenterModal({
  visible,
  onClose,
  broadcasts,
  loading = false,
}: Props) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const openBroadcast = async (broadcast: TBroadcast) => {
    const linkUrl = broadcast.linkUrl?.trim();
    if (!linkUrl) return;

    onClose();

    if (/^https?:\/\//i.test(linkUrl)) {
      const supported = await Linking.canOpenURL(linkUrl);
      if (supported) await Linking.openURL(linkUrl);
      return;
    }

    if (linkUrl.startsWith('/')) {
      router.push(mapInternalRoute(linkUrl) as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}12` }]}>
              <Bell size={18} color={colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.text }]}>নোটিফিকেশন</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {loading
                  ? 'ঘোষণা লোড হচ্ছে...'
                  : broadcasts.length > 0
                    ? `${broadcasts.length}টি সক্রিয় ঘোষণা`
                    : 'এই মুহূর্তে কোনো সক্রিয় ঘোষণা নেই'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <X size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size='small' color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>ঘোষণা লোড হচ্ছে...</Text>
            </View>
          ) : broadcasts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Bell size={24} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>নতুন কোনো ঘোষণা নেই</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>নতুন আপডেট বা গুরুত্বপূর্ণ ঘোষণা এলে এখানে দেখা যাবে।</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            >
              {broadcasts.map((broadcast) => {
                const config = typeConfig(broadcast.type);
                const TypeIcon = config.Icon;

                return (
                  <View
                    key={broadcast.id}
                    style={[
                      styles.notificationCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.typeIcon,
                          { backgroundColor: config.background, borderColor: config.border },
                        ]}
                      >
                        <TypeIcon size={15} color={config.color} />
                      </View>

                      <View style={styles.cardCopy}>
                        <View style={styles.cardTitleRow}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                            {broadcast.title}
                          </Text>
                          {broadcast.isPinned ? <Pin size={13} color={colors.primary} /> : null}
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: config.background, borderColor: config.border },
                          ]}
                        >
                          <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={4}>
                      {broadcast.message}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {formatBroadcastDate(broadcast.createdAt)}
                      </Text>

                      {broadcast.linkUrl ? (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          style={styles.detailsButton}
                          onPress={() => void openBroadcast(broadcast)}
                        >
                          <Text style={[styles.detailsText, { color: colors.primary }]}>
                            {broadcast.linkText || 'বিস্তারিত দেখুন'}
                          </Text>
                          <ArrowRight size={13} color={colors.primary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,.52)',
  },
  sheet: {
    maxHeight: '76%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    opacity: 0.42,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 16, fontFamily: Fonts.headingBold },
  subtitle: { marginTop: 1, fontSize: 10.5, fontFamily: Fonts.sansRegular },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 11, fontFamily: Fonts.sansRegular },
  emptyState: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 6,
  },
  emptyTitle: { fontSize: 13, fontFamily: Fonts.headingBold },
  emptyText: {
    maxWidth: 250,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: Fonts.sansRegular,
  },
  list: { gap: 10, paddingBottom: 4 },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 9,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, gap: 5 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  cardTitle: { flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.headingSemiBold },
  typeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: { fontSize: 9, fontFamily: Fonts.sansSemiBold },
  message: { fontSize: 10.5, lineHeight: 17, fontFamily: Fonts.sansRegular },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateText: { fontSize: 9.5, fontFamily: Fonts.sansRegular },
  detailsButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  detailsText: { fontSize: 10.5, fontFamily: Fonts.sansSemiBold },
});

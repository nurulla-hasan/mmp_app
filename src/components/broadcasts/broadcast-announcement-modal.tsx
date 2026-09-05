import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowRight, Info, Sparkles, Wrench, X } from 'lucide-react-native';
import { Button } from '../ui/button';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useActiveBroadcasts } from '../../hooks/queries/use-broadcasts';
import { useThemeStore } from '../../stores/theme-store';
import type { BroadcastType, TBroadcast } from '../../types/broadcast';

const DISMISS_KEY_PREFIX = 'mmp_broadcast_closed_';

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
        label: 'Promo',
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

export function BroadcastAnnouncementModal() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const broadcastsQuery = useActiveBroadcasts();
  const [queue, setQueue] = useState<TBroadcast[]>([]);

  const broadcasts = broadcastsQuery.data;
  const current = queue[0] ?? null;
  const currentType = useMemo(() => current ? typeConfig(current.type) : null, [current]);

  useEffect(() => {
    let cancelled = false;
    const items = broadcasts ?? [];

    async function prepareQueue() {
      if (items.length === 0) {
        if (!cancelled) setQueue([]);
        return;
      }

      try {
        const keys = items.map((item) => `${DISMISS_KEY_PREFIX}${item.id}`);
        const stored = await AsyncStorage.multiGet(keys);
        const dismissedKeys = new Set(
          stored.filter(([, value]) => value === 'true').map(([key]) => key)
        );
        const unseen = items.filter(
          (item) => !dismissedKeys.has(`${DISMISS_KEY_PREFIX}${item.id}`)
        );
        if (!cancelled) setQueue(unseen);
      } catch {
        if (!cancelled) setQueue(items);
      }
    }

    void prepareQueue();
    return () => {
      cancelled = true;
    };
  }, [broadcasts]);

  const dismissCurrent = async () => {
    if (!current) return;

    try {
      await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${current.id}`, 'true');
    } catch {
      // Dismiss for the current runtime even when persistence is unavailable.
    }

    setQueue((items) => items.filter((item) => item.id !== current.id));
  };

  const openLink = async () => {
    if (!current?.linkUrl) return;
    const linkUrl = current.linkUrl.trim();
    if (!linkUrl) return;

    await dismissCurrent();

    if (/^https?:\/\//i.test(linkUrl)) {
      const supported = await Linking.canOpenURL(linkUrl);
      if (supported) await Linking.openURL(linkUrl);
      return;
    }

    if (linkUrl.startsWith('/')) {
      router.push(mapInternalRoute(linkUrl) as any);
    }
  };

  if (!current || !currentType) return null;

  const TypeIcon = currentType.Icon;

  return (
    <Modal
      visible
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
              {queue.length > 1 ? (
                <Text style={[styles.countText, { color: colors.textMuted }]}>আরও {queue.length - 1}টি ঘোষণা আছে</Text>
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => void dismissCurrent()}
              style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <X size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.body}
          >
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: currentType.background,
                  borderColor: currentType.border,
                },
              ]}
            >
              <TypeIcon size={13} color={currentType.color} />
              <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
            </View>

            <Text style={[styles.message, { color: colors.textMuted }]}>{current.message}</Text>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title='বন্ধ করুন'
              variant='outline'
              onPress={() => void dismissCurrent()}
              style={styles.footerButton}
            />
            {current.linkUrl ? (
              <Button
                title={current.linkText || 'বিস্তারিত দেখুন'}
                onPress={() => void openLink()}
                icon={<ArrowRight size={14} color='#fff' />}
                style={styles.footerButton}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(2,6,23,.58)',
  },
  card: {
    width: '100%',
    maxHeight: '76%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: Fonts.headingBold,
  },
  countText: {
    marginTop: 2,
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  body: {
    gap: 13,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansSemiBold,
  },
  message: {
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: Fonts.sansRegular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 13,
    borderTopWidth: 1,
  },
  footerButton: {
    minWidth: 105,
  },
});

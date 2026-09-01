import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, Map as MapIcon, Trash2, Calendar, Layers } from 'lucide-react-native';
import { Badge } from '../ui/badge';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { useThemeStore } from '../../stores/theme-store';
import { useMapStore } from '../../features/land-measurement/store/useMapStore';
import { calculatePolygonData } from '../../features/land-measurement/utils/calculations';
import { PLOT_COLOR_PALETTE } from '../../features/land-measurement/utils/canvas';
import { useDeleteCalculation } from '../../hooks/mutations/use-calculation-mutations';
import { SuccessToast, toBengaliDigits } from '../../lib/utils';
import type { TCalculation } from '../../types/calculation';
import type { PlotRecord } from '../../features/land-measurement/types/map';

interface CalculationCardProps {
  calculation: TCalculation;
}

export const CalculationCard: React.FC<CalculationCardProps> = ({
  calculation,
}) => {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  // ── TanStack Mutation: optimistic delete + auto-invalidation ─────────────
  const { mutate: deleteCalculation, isPending: deleting } = useDeleteCalculation();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenInMap = () => {
    const scaleValue = calculation.scalePxPerUnit || null;
    if (scaleValue) {
      useMapStore.getState().setScale(scaleValue);
    }

    const loadedPlots: PlotRecord[] = (calculation.plots || []).map((p, idx) => {
      let rawPoints: { x: number; y: number }[] = [];
      if (Array.isArray(p.points)) {
        rawPoints = p.points as unknown as { x: number; y: number }[];
      } else if (typeof p.points === 'string') {
        try {
          rawPoints = JSON.parse(p.points);
        } catch {
          rawPoints = [];
        }
      }

      const results = calculatePolygonData(rawPoints, scaleValue);
      return {
        id: p.id || `${Date.now()}-${idx}`,
        name: p.plotNumber || `প্লট ${toBengaliDigits(idx + 1)}`,
        points: rawPoints,
        results: results || {
          sqft: 0,
          shotok: Number(p.areaShotok) || 0,
          katha: Number(p.areaKatha) || 0,
          lengths: [],
          perimeter: 0,
        },
        color: PLOT_COLOR_PALETTE[idx % PLOT_COLOR_PALETTE.length],
      };
    });

    useMapStore.getState().setPlots(loadedPlots);
    SuccessToast(`"${calculation.name}" পরিমাপ লোড হয়েছে!`);
    router.push('/land-measurement');
  };

  const handleDelete = () => {
    Alert.alert(
      'পরিমাপটি মুছে ফেলতে চান?',
      `"${calculation.name}" পরিমাপ এবং এর সমস্ত দাগ স্থায়ীভাবে মুছে ফেলা হবে।`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          // TanStack mutation handles optimistic update + invalidation + toast
          onPress: () => deleteCalculation(calculation.id),
        },
      ]
    );
  };

  const scale = calculation.scalePxPerUnit;
  const plotCount = calculation.plots?.length || 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderColor: isDark ? '#1f2937' : '#e2e8f0',
        },
      ]}
    >
      {/* Top Header Row: Project Name & Trash Delete button */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {calculation.name}
          </Text>
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.textMuted} />
            <Text style={[styles.metaDate, { color: colors.textMuted }]}>
              {formatDate(calculation.createdAt)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.deleteBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
            },
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size='small' color='#ef4444' />
          ) : (
            <Trash2 size={13} color='#ef4444' />
          )}
        </TouchableOpacity>
      </View>

      {/* Map File Info */}
      <View style={[styles.mapFileBox, { backgroundColor: isDark ? '#131b2e' : '#f8fafc', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
        <FileText size={13} color='#16a34a' />
        <Text style={[styles.mapFileName, { color: colors.textMuted }]} numberOfLines={1}>
          {calculation.mapName || 'ম্যাপ ফাইল'}
        </Text>
      </View>

      {/* Badges & Actions Footer */}
      <View style={styles.footerRow}>
        <View style={styles.badgesCol}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? '#334155' : '#cbd5e1',
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {scale ? `১ px ≈ ${(1 / scale).toFixed(2)} ft` : 'লিংক স্কেল'}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(22, 163, 74, 0.08)',
                borderColor: 'rgba(22, 163, 74, 0.25)',
              },
            ]}
          >
            <Layers size={10} color='#16a34a' />
            <Text style={[styles.badgeText, { color: '#16a34a' }]}>
              {toBengaliDigits(plotCount)} টি দাগ
            </Text>
          </View>
        </View>

        {/* Open In Map Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.openMapBtn}
          onPress={handleOpenInMap}
        >
          <MapIcon size={12} color='#ffffff' />
          <Text style={styles.openMapBtnText}>ম্যাপে খুলুন</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleCol: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDate: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  mapFileName: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    gap: 8,
  },
  badgesCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.sansMedium,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 6,
  },
  openMapBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
});


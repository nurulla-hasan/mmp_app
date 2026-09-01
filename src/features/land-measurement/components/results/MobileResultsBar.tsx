import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';
import { Badge } from '../../../../components/ui/badge';
import { Check, BookmarkPlus } from 'lucide-react-native';

export const MobileResultsBar: React.FC = () => {
  const { plotPoints, isPlotFinished, scale, finishPlot, plots } = useMapStore();

  const results = calculatePolygonData(plotPoints, scale || 1.0);

  if (plotPoints.length < 3 || !results) return null;

  return (
    <View style={styles.barContainer}>
      {/* Area Numbers */}
      <View style={styles.areaInfoCol}>
        <View style={styles.topRow}>
          <Text style={styles.shotokNumber}>
            {toBengaliDigits(results.shotok.toFixed(2))} <Text style={styles.shotokUnit}>শতক</Text>
          </Text>
          <Badge
            label={isPlotFinished ? 'সম্পূর্ণ দাগ' : 'অঙ্কন চলছে'}
            variant={isPlotFinished ? 'pro' : 'warning'}
          />
        </View>

        <Text style={styles.secondaryText}>
          {toBengaliDigits(results.katha.toFixed(2))} কাঠা • {toBengaliDigits(results.sqft.toFixed(1))} বর্গফুট
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {!isPlotFinished ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.doneBtn}
            onPress={finishPlot}
          >
            <Check size={16} color='#ffffff' strokeWidth={2.5} />
            <Text style={styles.doneBtnText}>সম্পূর্ণ</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.saveBtn}
            onPress={finishPlot}
          >
            <BookmarkPlus size={16} color='#ffffff' strokeWidth={2.2} />
            <Text style={styles.saveBtnText}>সংরক্ষণ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    top: 60,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 900,
  },
  areaInfoCol: {
    gap: 2,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shotokNumber: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: '#22c55e',
  },
  shotokUnit: {
    fontSize: 12.5,
    fontFamily: Fonts.headingSemiBold,
    color: '#86efac',
  },
  secondaryText: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: '#94a3b8',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  doneBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  saveBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
});

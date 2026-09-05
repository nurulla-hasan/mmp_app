import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Share2,
  X,
} from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/typography';
import type { KmzCoordinate } from '../types';

type Props = {
  coordinate: KmzCoordinate;
  onClose: () => void;
  theme: 'light' | 'dark';
};

function formatDMS(coordinate: number, isLat: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
  const direction = isLat
    ? coordinate >= 0
      ? 'N'
      : 'S'
    : coordinate >= 0
    ? 'E'
    : 'W';
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function CoordinateInspectorCard({
  coordinate,
  onClose,
  theme,
}: Props) {
  const isDark = theme === 'dark';
  const colors = Colors[theme];
  const [copied, setCopied] = useState(false);

  const latText = coordinate.latitude.toFixed(6);
  const lngText = coordinate.longitude.toFixed(6);
  const decimalStr = `${latText}, ${lngText}`;
  const dmsLat = formatDMS(coordinate.latitude, true);
  const dmsLng = formatDMS(coordinate.longitude, false);
  const dmsStr = `${dmsLat}, ${dmsLng}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(`${decimalStr} (${dmsStr})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('ত্রুটি', 'গুগল ম্যাপস ওপেন করা যায়নি।');
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mouza Map Pro Coordinate:\nLatitude/Longitude: ${decimalStr}\nDMS: ${dmsStr}\nGoogle Maps: https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? 'rgba(15, 23, 42, 0.98)'
            : 'rgba(255, 255, 255, 0.98)',
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark
                  ? 'rgba(34, 197, 94, 0.18)'
                  : 'rgba(22, 163, 74, 0.12)',
              },
            ]}
          >
            <MapPin size={15} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              পয়েন্ট কোঅর্ডিনেট
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              GPS Coordinates & Inspection
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          style={[styles.closeBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
        >
          <X size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Coordinate Values Box */}
      <View
        style={[
          styles.coordBox,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(241, 245, 249, 0.9)',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.coordRow}>
          <Text style={[styles.coordLabel, { color: colors.textMuted }]}>
            Decimal (DD):
          </Text>
          <Text
            selectable
            style={[styles.coordValue, { color: colors.text }]}
          >
            {decimalStr}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.coordRow}>
          <Text style={[styles.coordLabel, { color: colors.textMuted }]}>
            DMS:
          </Text>
          <Text
            selectable
            style={[styles.coordValueDms, { color: colors.primary }]}
          >
            {dmsLat}
          </Text>
        </View>
        <View style={styles.coordRowRight}>
          <Text
            selectable
            style={[styles.coordValueDms, { color: colors.primary }]}
          >
            {dmsLng}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleCopy}
          style={[
            styles.actionButton,
            {
              backgroundColor: copied
                ? '#16a34a'
                : isDark
                ? '#1e293b'
                : '#f1f5f9',
              borderColor: copied ? '#16a34a' : colors.border,
            },
          ]}
        >
          {copied ? (
            <Check size={14} color="#ffffff" />
          ) : (
            <Copy size={14} color={colors.text} />
          )}
          <Text
            style={[
              styles.actionButtonText,
              { color: copied ? '#ffffff' : colors.text },
            ]}
          >
            {copied ? 'কপি হয়েছে' : 'কপি'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleOpenGoogleMaps}
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              borderColor: colors.border,
            },
          ]}
        >
          <ExternalLink size={14} color={colors.primary} />
          <Text
            style={[styles.actionButtonText, { color: colors.primary }]}
          >
            Google Maps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleShare}
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              borderColor: colors.border,
            },
          ]}
        >
          <Share2 size={14} color={colors.text} />
          <Text
            style={[styles.actionButtonText, { color: colors.text }]}
          >
            শেয়ার
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
  },
  subtitle: {
    fontFamily: Fonts.sansRegular,
    fontSize: 9.5,
    marginTop: -1,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coordRowRight: {
    alignItems: 'flex-end',
    marginTop: -2,
  },
  coordLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10.5,
  },
  coordValue: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
  },
  coordValueDms: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 11,
  },
});

import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Image as ImageIcon,
  Move,
  PenTool,
  RotateCcw,
  Ruler,
  Trash2,
} from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

type Props = {
  onOpenScaleModal: () => void;
  onOpenImagePicker: () => void;
};

type ToolButtonProps = {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  onPress: () => void;
};

function ToolButton({ label, active, danger, disabled, icon, onPress }: ToolButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.72}
      disabled={disabled}
      onPress={onPress}
      style={[styles.toolButton, active && styles.activeButton, disabled && styles.disabledButton]}
    >
      {icon}
      <Text style={[styles.toolLabel, active && styles.activeLabel, danger && styles.dangerLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function MobileCanvasToolbar({ onOpenScaleModal, onOpenImagePicker }: Props) {
  const mode = useMapStore((state) => state.mode);
  const plotPoints = useMapStore((state) => state.plotPoints);
  const plots = useMapStore((state) => state.plots);
  const plotsHistory = useMapStore((state) => state.plotsHistory);
  const setMode = useMapStore((state) => state.setMode);
  const startPlotDrawing = useMapStore((state) => state.startPlotDrawing);
  const undoPlotAction = useMapStore((state) => state.undoPlotAction);
  const clearPlots = useMapStore((state) => state.clearPlots);

  const canUndo = plotPoints.length > 0 || plotsHistory.length > 0;
  const hasDrawing = plotPoints.length > 0 || plots.length > 0;

  const confirmClear = () => {
    if (!hasDrawing) return;
    Alert.alert(
      'সব প্লট মুছবেন?',
      'এই ম্যাপের আঁকা সব পয়েন্ট ও পরিমাপ মুছে যাবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: 'মুছুন', style: 'destructive', onPress: clearPlots },
      ],
    );
  };

  return (
    <View style={styles.wrapper}>
      <ToolButton
        label='প্যান'
        active={mode === 'none'}
        icon={<Move size={18} color={mode === 'none' ? '#ffffff' : '#94a3b8'} />}
        onPress={() => setMode('none')}
      />
      <ToolButton
        label='আঁকুন'
        active={mode === 'drawing_plot'}
        icon={<PenTool size={18} color={mode === 'drawing_plot' ? '#ffffff' : '#94a3b8'} />}
        onPress={startPlotDrawing}
      />
      <ToolButton
        label='স্কেল'
        active={mode === 'calibrating'}
        icon={<Ruler size={18} color={mode === 'calibrating' ? '#ffffff' : '#94a3b8'} />}
        onPress={onOpenScaleModal}
      />
      <ToolButton
        label='ম্যাপ'
        icon={<ImageIcon size={18} color='#94a3b8' />}
        onPress={onOpenImagePicker}
      />
      <ToolButton
        label='আনডু'
        disabled={!canUndo}
        icon={<RotateCcw size={18} color='#94a3b8' />}
        onPress={undoPlotAction}
      />
      <ToolButton
        label='মুছুন'
        danger
        disabled={!hasDrawing}
        icon={<Trash2 size={18} color='#ef4444' />}
        onPress={confirmClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
  },
  toolButton: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#16a34a',
  },
  disabledButton: {
    opacity: 0.35,
  },
  toolLabel: {
    color: '#94a3b8',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 9.5,
  },
  activeLabel: {
    color: '#ffffff',
  },
  dangerLabel: {
    color: '#ef4444',
  },
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import {
  PenTool,
  Move,
  Ruler,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

interface MobileCanvasToolbarProps {
  onOpenScaleModal: () => void;
  onOpenImagePicker: () => void;
}

export const MobileCanvasToolbar: React.FC<MobileCanvasToolbarProps> = ({
  onOpenScaleModal,
  onOpenImagePicker,
}) => {
  const {
    mode,
    plotPoints,
    setMode,
    startPlotDrawing,
    undoPlotAction,
    clearPlot,
  } = useMapStore();

  const isDraw = mode === 'drawing_plot';
  const isPan = mode === 'none';
  const isCalibrate = mode === 'calibrating';

  return (
    <View style={styles.toolbarWrapper}>
      {/* 1. Draw Mode */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.toolBtn, isDraw && styles.toolBtnActive]}
        onPress={() => {
          if (mode !== 'drawing_plot') {
            startPlotDrawing();
          }
        }}
      >
        <PenTool
          size={18}
          color={isDraw ? '#ffffff' : '#94a3b8'}
          strokeWidth={2.2}
        />
        <Text style={[styles.toolLabel, isDraw && styles.toolLabelActive]}>অঙ্কন</Text>
      </TouchableOpacity>

      {/* 2. Pan / Zoom Mode */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.toolBtn, isPan && styles.toolBtnActive]}
        onPress={() => setMode('none')}
      >
        <Move
          size={18}
          color={isPan ? '#ffffff' : '#94a3b8'}
          strokeWidth={2.2}
        />
        <Text style={[styles.toolLabel, isPan && styles.toolLabelActive]}>জুম/প্যান</Text>
      </TouchableOpacity>

      {/* 3. Scale Calibration */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.toolBtn, isCalibrate && styles.toolBtnActive]}
        onPress={onOpenScaleModal}
      >
        <Ruler
          size={18}
          color={isCalibrate ? '#ffffff' : '#94a3b8'}
          strokeWidth={2.2}
        />
        <Text style={[styles.toolLabel, isCalibrate && styles.toolLabelActive]}>স্কেল</Text>
      </TouchableOpacity>

      {/* 4. Map Image Picker */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.toolBtn}
        onPress={onOpenImagePicker}
      >
        <ImageIcon size={18} color='#94a3b8' strokeWidth={2.2} />
        <Text style={styles.toolLabel}>ম্যাপ</Text>
      </TouchableOpacity>

      {/* 5. Undo */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.toolBtn, plotPoints.length === 0 && { opacity: 0.35 }]}
        disabled={plotPoints.length === 0}
        onPress={() => undoPlotAction()}
      >
        <RotateCcw size={18} color='#94a3b8' strokeWidth={2.2} />
        <Text style={styles.toolLabel}>আনডু</Text>
      </TouchableOpacity>

      {/* 6. Clear Active Plot */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.toolBtn, plotPoints.length === 0 && { opacity: 0.35 }]}
        disabled={plotPoints.length === 0}
        onPress={() => clearPlot()}
      >
        <Trash2 size={18} color='#ef4444' strokeWidth={2.2} />
        <Text style={[styles.toolLabel, { color: '#ef4444' }]}>মুছুন</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 900,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: '#16a34a',
  },
  toolLabel: {
    fontSize: 10,
    fontFamily: Fonts.headingSemiBold,
    color: '#94a3b8',
  },
  toolLabelActive: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
  },
});

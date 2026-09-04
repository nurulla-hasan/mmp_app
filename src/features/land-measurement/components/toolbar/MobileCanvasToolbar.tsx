import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  BookmarkCheck, Check, Crosshair, FolderOpen, HardDrive, HelpCircle,
  Image as ImageIcon, Minus, MoreHorizontal, MoveHorizontal, PenTool, Plus, Redo2,
  RotateCcw, Ruler, Scissors, Search, SearchX, Undo2, X,
} from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';
import { useThemeStore } from '../../../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';
import { canvasPointActionGesture } from '../canvas/canvas-runtime';

type Props = {
  onOpenManualScale: () => void;
  onOpenImagePicker: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
};

type ActionProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  compact?: boolean;
};

function Action({ label, icon, onPress, active, disabled, primary, danger, compact }: ActionProps) {
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  return (
    <TouchableOpacity
      activeOpacity={0.74}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        compact && styles.compactAction,
        active && styles.active,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[
          styles.actionLabel,
          { color: colors.textSoft },
          compact && styles.compactActionLabel,
          (active || primary) && styles.white,
          danger && styles.danger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PointAction({ label, icon, disabled }: Omit<ActionProps, 'onPress'>) {
  const content = (
    <View style={[styles.action, styles.primary, disabled && styles.disabled]}>
      {icon}
      <Text numberOfLines={1} style={[styles.actionLabel, styles.white]}>{label}</Text>
    </View>
  );

  if (disabled) return content;
  return <GestureDetector gesture={canvasPointActionGesture}>{content}</GestureDetector>;
}

export function MobileCanvasToolbar({ onOpenManualScale, onOpenImagePicker, onOpenSave, onOpenLoad }: Props) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const muted = colors.iconMuted;

  const mode = useMapStore((state) => state.mode);
  const hasMapImage = useMapStore((state) => Boolean(state.mapImage));
  const hasScale = useMapStore((state) => Boolean(state.scale));
  const plotPointCount = useMapStore((state) => state.plotPoints.length);
  const plotFutureCount = useMapStore((state) => state.plotPointsFuture.length);
  const plotCount = useMapStore((state) => state.plots.length);
  const calibrationPointCount = useMapStore((state) => state.calibrationLine.length / 2);
  const calibrationFutureCount = useMapStore((state) => state.calibrationLineFuture.length / 2);
  const isMagnifierEnabled = useMapStore((state) => state.isMagnifierEnabled);
  const manualDividePlotId = useMapStore((state) => state.manualDividePlotId);
  const manualCutPointCount = useMapStore((state) => state.manualCutLine?.length ?? 0);
  const nudgeTarget = useMapStore((state) => state.nudgeTarget);

  const startCalibration = useMapStore((state) => state.startCalibration);
  const cancelCalibration = useMapStore((state) => state.cancelCalibration);
  const undoCalibrationPoint = useMapStore((state) => state.undoCalibrationPoint);
  const redoCalibrationPoint = useMapStore((state) => state.redoCalibrationPoint);
  const cancelActiveMode = useMapStore((state) => state.cancelActiveMode);
  const undoPlotAction = useMapStore((state) => state.undoPlotAction);
  const redoPlotAction = useMapStore((state) => state.redoPlotAction);
  const finishPlot = useMapStore((state) => state.finishPlot);
  const cancelManualDivide = useMapStore((state) => state.cancelManualDivide);
  const setNudgeTarget = useMapStore((state) => state.setNudgeTarget);
  const nudgeManualCutLine = useMapStore((state) => state.nudgeManualCutLine);
  const addManualCutPoint = useMapStore((state) => state.addManualCutPoint);
  const removeManualCutPoint = useMapStore((state) => state.removeManualCutPoint);
  const executeManualDivide = useMapStore((state) => state.executeManualDivide);
  const clearMap = useMapStore((state) => state.clearMap);
  const setIsMagnifierEnabled = useMapStore((state) => state.setIsMagnifierEnabled);
  const startPlotDrawing = useMapStore((state) => state.startPlotDrawing);
  const startManualDivide = useMapStore((state) => state.startManualDivide);

  const panelStyle = { backgroundColor: colors.overlay, borderColor: colors.panelBorder };

  const beginCalibration = () => {
    if (!hasMapImage) { onOpenImagePicker(); return; }
    if (plotCount === 0) { startCalibration(); return; }
    Alert.alert('Reset scale?', 'Changing the scale will remove all current plots.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', style: 'destructive', onPress: startCalibration },
    ]);
  };

  const resetMap = () => {
    if (!hasMapImage) return;
    Alert.alert('Clear measurement?', 'This will remove the current map, plots, and active work.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { clearMap(); setIsMoreOpen(false); } },
    ]);
  };

  if (mode === 'calibrating') {
    return (
      <View style={[styles.wrapper, panelStyle]}>
        <Action label='Cancel' danger icon={<X size={18} color='#ef4444' />} onPress={cancelCalibration} />
        <Action label='Undo' disabled={calibrationPointCount === 0} icon={<Undo2 size={18} color={muted} />} onPress={undoCalibrationPoint} />
        <Action label='Redo' disabled={calibrationFutureCount === 0} icon={<Redo2 size={18} color={muted} />} onPress={redoCalibrationPoint} />
        <Action label='Manual' icon={<Ruler size={18} color='#d97706' />} onPress={onOpenManualScale} />
        <PointAction label={`Point ${calibrationPointCount}/2`} disabled={calibrationPointCount >= 2} icon={<Crosshair size={19} color='#fff' />} />
      </View>
    );
  }

  if (mode === 'drawing_plot') {
    return (
      <View style={[styles.wrapper, panelStyle]}>
        <Action label='Cancel' danger icon={<X size={18} color='#ef4444' />} onPress={cancelActiveMode} />
        <Action label='Undo' disabled={plotPointCount === 0} icon={<Undo2 size={18} color={muted} />} onPress={undoPlotAction} />
        <Action label='Redo' disabled={plotFutureCount === 0} icon={<Redo2 size={18} color={muted} />} onPress={redoPlotAction} />
        <PointAction label={`Point ${plotPointCount}`} icon={<Crosshair size={19} color='#fff' />} />
        <Action label='Finish' disabled={plotPointCount < 3} icon={<Check size={19} color={colors.success} />} onPress={finishPlot} />
      </View>
    );
  }

  if (mode === 'manual_divide_plot') {
    if (!manualDividePlotId || manualCutPointCount === 0) {
      return (
        <View style={[styles.wrapper, panelStyle]}>
          <Action label='Cancel' danger icon={<X size={18} color='#ef4444' />} onPress={cancelManualDivide} />
          <View style={styles.divideMessage}><Text style={[styles.divideText, { color: colors.textStrong }]}>Tap the plot to divide</Text></View>
        </View>
      );
    }

    const nextTarget = nudgeTarget === 'all' ? 'start' : nudgeTarget === 'start' ? 'end' : 'all';
    const targetLabel = nudgeTarget === 'all' ? 'Full line' : nudgeTarget === 'start' ? 'Start point' : 'End point';

    return (
      <View style={[styles.divideWrapper, panelStyle]}>
        <View style={[styles.divideTop, { backgroundColor: colors.panelAlt, borderBottomColor: colors.panelBorder }]}>
          <View style={styles.divideTopInfo}>
            <Text style={[styles.divideHeading, { color: colors.textStrong }]}>Adjust cut line</Text>
            <Text style={[styles.divideTopText, { color: colors.textSoft }]}>Move: {targetLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setNudgeTarget(nextTarget)} style={[styles.targetButton, { backgroundColor: colors.blueBg }]}>
            <MoveHorizontal size={14} color={colors.blueText} />
            <Text style={[styles.targetText, { color: colors.blueText }]}>Target</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divideActions}>
          <Action compact label='Cancel' danger icon={<X size={17} color='#ef4444' />} onPress={cancelManualDivide} />
          <Action compact label='Left' icon={<Undo2 size={17} color={muted} />} onPress={() => nudgeManualCutLine(-1)} />
          <Action compact label='Right' icon={<Redo2 size={17} color={muted} />} onPress={() => nudgeManualCutLine(1)} />
          <Action compact label='Point +' icon={<Plus size={17} color={colors.blue} />} onPress={addManualCutPoint} />
          <Action compact label='Point -' disabled={manualCutPointCount <= 2} icon={<Minus size={17} color={colors.blue} />} onPress={removeManualCutPoint} />
          <Action compact label='Divide' primary icon={<Scissors size={17} color='#fff' />} onPress={executeManualDivide} />
        </View>
      </View>
    );
  }

  return <>
    {isMoreOpen && <View style={[styles.morePanel, panelStyle]}>
      {plotCount > 0 && <Action label='Save' active icon={<BookmarkCheck size={18} color='#fff' />} onPress={() => { setIsMoreOpen(false); onOpenSave(); }} />}
      <Action label='Drive' icon={<HardDrive size={18} color={muted} />} onPress={() => void Linking.openURL('https://drive.google.com/drive/folders/1r0ryb1SyCeYV-41CM1WweokGDKT5t9RB')} />
      <Action label='Help' icon={<HelpCircle size={18} color={muted} />} onPress={() => Alert.alert('How to use', 'Add map → set scale → move the crosshair to a corner → add points → finish the plot.')} />
      <Action label='Reset' danger disabled={!hasMapImage} icon={<RotateCcw size={18} color='#ef4444' />} onPress={resetMap} />
    </View>}
    <View style={[styles.wrapper, panelStyle]}>
      <Action label='Map' icon={<ImageIcon size={18} color={muted} />} onPress={onOpenImagePicker} />
      <Action label='Saved' icon={<FolderOpen size={18} color={muted} />} onPress={onOpenLoad} />
      <Action label='Scale' icon={<Ruler size={18} color={hasScale ? muted : '#d97706'} />} onPress={beginCalibration} />
      <Action label='Draw' disabled={!hasMapImage || !hasScale} icon={<PenTool size={18} color={muted} />} onPress={startPlotDrawing} />
      <Action label='Divide' disabled={plotCount === 0} icon={<Scissors size={18} color={muted} />} onPress={startManualDivide} />
      <Action label='Magnify' active={isMagnifierEnabled} icon={isMagnifierEnabled ? <SearchX size={18} color='#fff' /> : <Search size={18} color={muted} />} onPress={() => setIsMagnifierEnabled(!isMagnifierEnabled)} />
      <Action label='More' active={isMoreOpen} icon={<MoreHorizontal size={18} color={isMoreOpen ? '#fff' : muted} />} onPress={() => setIsMoreOpen((open) => !open)} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 14, borderWidth: 1, elevation: 12 },
  action: { minWidth: 43, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 9 },
  compactAction: { flex: 1, minWidth: 0, minHeight: 43, paddingHorizontal: 2, paddingVertical: 4, borderRadius: 8 },
  active: { backgroundColor: '#2563eb' },
  primary: { backgroundColor: '#16a34a', paddingHorizontal: 9 },
  disabled: { opacity: 0.32 },
  actionLabel: { fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  compactActionLabel: { fontSize: 8 },
  white: { color: '#fff' },
  danger: { color: '#ef4444' },
  divideMessage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divideText: { fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  divideWrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, borderRadius: 12, borderWidth: 1, overflow: 'hidden', elevation: 12 },
  divideTop: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth },
  divideTopInfo: { flex: 1 },
  divideHeading: { fontFamily: Fonts.headingSemiBold, fontSize: 10 },
  divideTopText: { marginTop: -1, fontFamily: Fonts.headingMedium, fontSize: 8.5 },
  targetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  targetText: { fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  divideActions: { width: '100%', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: 2, paddingHorizontal: 5, paddingVertical: 5 },
  morePanel: { position: 'absolute', bottom: 82, right: 8, zIndex: 21, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6, borderRadius: 14, borderWidth: 1, elevation: 14 },
});

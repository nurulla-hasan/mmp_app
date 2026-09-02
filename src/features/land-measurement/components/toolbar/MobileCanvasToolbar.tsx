import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  BookmarkCheck, Check, Crosshair, Eye, EyeOff, FolderOpen, HardDrive, HelpCircle,
  Image as ImageIcon, Minus, MoreHorizontal, MoveHorizontal, PenTool, Plus, Redo2,
  RotateCcw, Ruler, Scissors, Search, SearchX, Undo2, X,
} from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';
import { toBengaliDigits } from '../../../../lib/utils';
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

/**
 * Point uses the same native recognizer that the canvas Pan marks as external
 * simultaneous. Android can therefore keep finger #1 panning while finger #2
 * commits the crosshair point independently.
 */
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

  // Keep this component isolated from high-frequency canvas coordinates.
  // Primitive selectors mean pan/zoom and divide-anchor movement do not rerender
  // the toolbar unless a value that changes its UI actually changes.
  const mode = useMapStore((state) => state.mode);
  const hasMapImage = useMapStore((state) => Boolean(state.mapImage));
  const hasScale = useMapStore((state) => Boolean(state.scale));
  const plotPointCount = useMapStore((state) => state.plotPoints.length);
  const plotFutureCount = useMapStore((state) => state.plotPointsFuture.length);
  const plotCount = useMapStore((state) => state.plots.length);
  const calibrationPointCount = useMapStore((state) => state.calibrationLine.length / 2);
  const calibrationFutureCount = useMapStore((state) => state.calibrationLineFuture.length / 2);
  const isShowDiagonals = useMapStore((state) => state.isShowDiagonals);
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
  const setIsShowDiagonals = useMapStore((state) => state.setIsShowDiagonals);
  const setIsMagnifierEnabled = useMapStore((state) => state.setIsMagnifierEnabled);
  const startPlotDrawing = useMapStore((state) => state.startPlotDrawing);
  const startManualDivide = useMapStore((state) => state.startManualDivide);

  const beginCalibration = () => {
    if (!hasMapImage) { onOpenImagePicker(); return; }
    if (plotCount === 0) { startCalibration(); return; }
    Alert.alert('স্কেল আবার সেট করবেন?', 'স্কেল বদলালে বর্তমান সব প্লট মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'চালিয়ে যান', style: 'destructive', onPress: startCalibration },
    ]);
  };

  const resetMap = () => {
    if (!hasMapImage) return;
    Alert.alert('সব মুছে ফেলবেন?', 'বর্তমান ম্যাপ, স্কেল ছাড়া সব প্লট ও চলমান কাজ মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'মুছে ফেলুন', style: 'destructive', onPress: () => { clearMap(); setIsMoreOpen(false); } },
    ]);
  };

  if (mode === 'calibrating') {
    return (
      <View style={styles.wrapper}>
        <Action label='বাতিল' danger icon={<X size={18} color='#ef4444' />} onPress={cancelCalibration} />
        <Action label='আনডু' disabled={calibrationPointCount === 0} icon={<Undo2 size={18} color='#cbd5e1' />} onPress={undoCalibrationPoint} />
        <Action label='রিডু' disabled={calibrationFutureCount === 0} icon={<Redo2 size={18} color='#cbd5e1' />} onPress={redoCalibrationPoint} />
        <Action label='ম্যানুয়াল' icon={<Ruler size={18} color='#fbbf24' />} onPress={onOpenManualScale} />
        <PointAction label={`পয়েন্ট ${toBengaliDigits(calibrationPointCount)}/২`} disabled={calibrationPointCount >= 2} icon={<Crosshair size={19} color='#fff' />} />
      </View>
    );
  }

  if (mode === 'drawing_plot') {
    return (
      <View style={styles.wrapper}>
        <Action label='বাতিল' danger icon={<X size={18} color='#ef4444' />} onPress={cancelActiveMode} />
        <Action label='আনডু' disabled={plotPointCount === 0} icon={<Undo2 size={18} color='#cbd5e1' />} onPress={undoPlotAction} />
        <Action label='রিডু' disabled={plotFutureCount === 0} icon={<Redo2 size={18} color='#cbd5e1' />} onPress={redoPlotAction} />
        <PointAction label={`পয়েন্ট ${toBengaliDigits(plotPointCount)}`} icon={<Crosshair size={19} color='#fff' />} />
        <Action label='শেষ করুন' disabled={plotPointCount < 3} icon={<Check size={19} color='#86efac' />} onPress={finishPlot} />
      </View>
    );
  }

  if (mode === 'manual_divide_plot') {
    if (!manualDividePlotId || manualCutPointCount === 0) {
      return (
        <View style={styles.wrapper}>
          <Action label='Cancel' danger icon={<X size={18} color='#ef4444' />} onPress={cancelManualDivide} />
          <View style={styles.divideMessage}><Text style={styles.divideText}>Tap the plot to divide</Text></View>
        </View>
      );
    }

    const nextTarget = nudgeTarget === 'all' ? 'start' : nudgeTarget === 'start' ? 'end' : 'all';
    const targetLabel = nudgeTarget === 'all' ? 'Full line' : nudgeTarget === 'start' ? 'Start point' : 'End point';

    return (
      <View style={styles.divideWrapper}>
        <View style={styles.divideTop}>
          <View style={styles.divideTopInfo}>
            <Text style={styles.divideHeading}>Adjust cut line</Text>
            <Text style={styles.divideTopText}>Move: {targetLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setNudgeTarget(nextTarget)} style={styles.targetButton}>
            <MoveHorizontal size={14} color='#bfdbfe' />
            <Text style={styles.targetText}>Target</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divideActions}>
          <Action compact label='Cancel' danger icon={<X size={17} color='#ef4444' />} onPress={cancelManualDivide} />
          <Action compact label='Left' icon={<Undo2 size={17} color='#cbd5e1' />} onPress={() => nudgeManualCutLine(-1)} />
          <Action compact label='Right' icon={<Redo2 size={17} color='#cbd5e1' />} onPress={() => nudgeManualCutLine(1)} />
          <Action compact label='Point +' icon={<Plus size={17} color='#93c5fd' />} onPress={addManualCutPoint} />
          <Action compact label='Point −' disabled={manualCutPointCount <= 2} icon={<Minus size={17} color='#93c5fd' />} onPress={removeManualCutPoint} />
          <Action compact label='Divide' primary icon={<Scissors size={17} color='#fff' />} onPress={executeManualDivide} />
        </View>
      </View>
    );
  }

  return <>
    {isMoreOpen && <View style={styles.morePanel}>
      {plotCount > 0 && <Action label='সেভ' active icon={<BookmarkCheck size={18} color='#fff' />} onPress={() => { setIsMoreOpen(false); onOpenSave(); }} />}
      <Action label='ড্রাইভ' icon={<HardDrive size={18} color='#94a3b8' />} onPress={() => void Linking.openURL('https://drive.google.com/drive/folders/1r0ryb1SyCeYV-41CM1WweokGDKT5t9RB')} />
      <Action label='কর্ণ' active={isShowDiagonals} icon={isShowDiagonals ? <Eye size={18} color='#fff' /> : <EyeOff size={18} color='#94a3b8' />} onPress={() => setIsShowDiagonals(!isShowDiagonals)} />
      <Action label='সাহায্য' icon={<HelpCircle size={18} color='#94a3b8' />} onPress={() => Alert.alert('ব্যবহার', 'ম্যাপ নিন → স্কেল সেট করুন → ক্রসহেয়ার কোণায় এনে পয়েন্ট যোগ করুন → শেষ করুন।')} />
      <Action label='রিসেট' danger disabled={!hasMapImage} icon={<RotateCcw size={18} color='#ef4444' />} onPress={resetMap} />
    </View>}
    <View style={styles.wrapper}>
      <Action label='ম্যাপ' icon={<ImageIcon size={18} color='#94a3b8' />} onPress={onOpenImagePicker} />
      <Action label='সেভড' icon={<FolderOpen size={18} color='#94a3b8' />} onPress={onOpenLoad} />
      <Action label='স্কেল' icon={<Ruler size={18} color={hasScale ? '#94a3b8' : '#fbbf24'} />} onPress={beginCalibration} />
      <Action label='আঁকুন' disabled={!hasMapImage || !hasScale} icon={<PenTool size={18} color='#94a3b8' />} onPress={startPlotDrawing} />
      <Action label='ভাগ' disabled={plotCount === 0} icon={<Scissors size={18} color='#94a3b8' />} onPress={startManualDivide} />
      <Action label='ম্যাগনিফাই' active={isMagnifierEnabled} icon={isMagnifierEnabled ? <SearchX size={18} color='#fff' /> : <Search size={18} color='#94a3b8' />} onPress={() => setIsMagnifierEnabled(!isMagnifierEnabled)} />
      <Action label='আরও' active={isMoreOpen} icon={<MoreHorizontal size={18} color={isMoreOpen ? '#fff' : '#94a3b8'} />} onPress={() => setIsMoreOpen((open) => !open)} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', elevation: 12 },
  action: { minWidth: 43, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 9 },
  compactAction: { flex: 1, minWidth: 0, minHeight: 43, paddingHorizontal: 2, paddingVertical: 4, borderRadius: 8 },
  active: { backgroundColor: '#2563eb' },
  primary: { backgroundColor: '#16a34a', paddingHorizontal: 9 },
  disabled: { opacity: 0.32 },
  actionLabel: { color: '#94a3b8', fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  compactActionLabel: { fontSize: 8 },
  white: { color: '#fff' },
  danger: { color: '#ef4444' },
  divideMessage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divideText: { color: '#e2e8f0', fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  divideWrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', overflow: 'hidden', elevation: 12 },
  divideTop: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155', backgroundColor: '#111827' },
  divideTopInfo: { flex: 1 },
  divideHeading: { color: '#f8fafc', fontFamily: Fonts.headingSemiBold, fontSize: 10 },
  divideTopText: { marginTop: -1, color: '#94a3b8', fontFamily: Fonts.headingMedium, fontSize: 8.5 },
  targetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#1e3a8a' },
  targetText: { color: '#bfdbfe', fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  divideActions: { width: '100%', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: 2, paddingHorizontal: 5, paddingVertical: 5 },
  morePanel: { position: 'absolute', bottom: 82, right: 8, zIndex: 21, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', elevation: 14 },
});

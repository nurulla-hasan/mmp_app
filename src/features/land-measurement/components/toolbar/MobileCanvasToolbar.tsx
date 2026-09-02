import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BookmarkCheck, Check, Crosshair, Eye, EyeOff, FolderOpen, HardDrive, HelpCircle,
  Image as ImageIcon, Minus, MoreHorizontal, MoveHorizontal, PenTool, Plus, Redo2,
  RotateCcw, Ruler, Scissors, Search, SearchX, Undo2, X,
} from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';
import { toBengaliDigits } from '../../../../lib/utils';
import { commitCenterPointFromRuntime } from '../canvas/canvas-runtime';

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

export function MobileCanvasToolbar({ onOpenManualScale, onOpenImagePicker, onOpenSave, onOpenLoad }: Props) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const store = useMapStore();
  const {
    mode, mapImage, scale, plotPoints, plotPointsFuture, plots,
    calibrationLine, calibrationLineFuture, isShowDiagonals, isMagnifierEnabled,
    manualDividePlotId, manualCutLine, nudgeTarget,
  } = store;

  const beginCalibration = () => {
    if (!mapImage) { onOpenImagePicker(); return; }
    if (plots.length === 0) { store.startCalibration(); return; }
    Alert.alert('স্কেল আবার সেট করবেন?', 'স্কেল বদলালে বর্তমান সব প্লট মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'চালিয়ে যান', style: 'destructive', onPress: store.startCalibration },
    ]);
  };

  const resetMap = () => {
    if (!mapImage) return;
    Alert.alert('সব মুছে ফেলবেন?', 'বর্তমান ম্যাপ, স্কেল ছাড়া সব প্লট ও চলমান কাজ মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'মুছে ফেলুন', style: 'destructive', onPress: () => { store.clearMap(); setIsMoreOpen(false); } },
    ]);
  };

  const addCenterPoint = () => {
    commitCenterPointFromRuntime();
  };

  if (mode === 'calibrating') {
    const count = calibrationLine.length / 2;
    return (
      <View style={styles.wrapper}>
        <Action label='বাতিল' danger icon={<X size={18} color='#ef4444' />} onPress={store.cancelCalibration} />
        <Action label='আনডু' disabled={count === 0} icon={<Undo2 size={18} color='#cbd5e1' />} onPress={store.undoCalibrationPoint} />
        <Action label='রিডু' disabled={calibrationLineFuture.length === 0} icon={<Redo2 size={18} color='#cbd5e1' />} onPress={store.redoCalibrationPoint} />
        <Action label='ম্যানুয়াল' icon={<Ruler size={18} color='#fbbf24' />} onPress={onOpenManualScale} />
        <Action label={`পয়েন্ট ${toBengaliDigits(count)}/২`} primary disabled={count >= 2} icon={<Crosshair size={19} color='#fff' />} onPress={addCenterPoint} />
      </View>
    );
  }

  if (mode === 'drawing_plot') {
    return (
      <View style={styles.wrapper}>
        <Action label='বাতিল' danger icon={<X size={18} color='#ef4444' />} onPress={store.cancelActiveMode} />
        <Action label='আনডু' disabled={plotPoints.length === 0} icon={<Undo2 size={18} color='#cbd5e1' />} onPress={store.undoPlotAction} />
        <Action label='রিডু' disabled={plotPointsFuture.length === 0} icon={<Redo2 size={18} color='#cbd5e1' />} onPress={store.redoPlotAction} />
        <Action label={`পয়েন্ট ${toBengaliDigits(plotPoints.length)}`} primary icon={<Crosshair size={19} color='#fff' />} onPress={addCenterPoint} />
        <Action label='শেষ করুন' disabled={plotPoints.length < 3} icon={<Check size={19} color='#86efac' />} onPress={store.finishPlot} />
      </View>
    );
  }

  if (mode === 'manual_divide_plot') {
    if (!manualDividePlotId || !manualCutLine) {
      return (
        <View style={styles.wrapper}>
          <Action label='বাতিল' danger icon={<X size={18} color='#ef4444' />} onPress={store.cancelManualDivide} />
          <View style={styles.divideMessage}><Text style={styles.divideText}>ভাগ করার প্লটে ট্যাপ করুন</Text></View>
        </View>
      );
    }

    const nextTarget = nudgeTarget === 'all' ? 'start' : nudgeTarget === 'start' ? 'end' : 'all';
    const targetLabel = nudgeTarget === 'all' ? 'পুরো লাইন' : nudgeTarget === 'start' ? 'শুরুর পয়েন্ট' : 'শেষ পয়েন্ট';

    return (
      <View style={styles.divideWrapper}>
        <View style={styles.divideTop}>
          <View style={styles.divideTopInfo}>
            <Text style={styles.divideHeading}>কাটিং লাইন ঠিক করুন</Text>
            <Text style={styles.divideTopText}>নড়বে: {targetLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => store.setNudgeTarget(nextTarget)} style={styles.targetButton}>
            <MoveHorizontal size={14} color='#bfdbfe' />
            <Text style={styles.targetText}>টার্গেট বদলান</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.divideActions}>
          <Action compact label='বাতিল' danger icon={<X size={17} color='#ef4444' />} onPress={store.cancelManualDivide} />
          <Action compact label='বামে' icon={<Undo2 size={17} color='#cbd5e1' />} onPress={() => store.nudgeManualCutLine(-1)} />
          <Action compact label='ডানে' icon={<Redo2 size={17} color='#cbd5e1' />} onPress={() => store.nudgeManualCutLine(1)} />
          <Action compact label='পয়েন্ট +' icon={<Plus size={17} color='#93c5fd' />} onPress={store.addManualCutPoint} />
          <Action compact label='পয়েন্ট −' disabled={manualCutLine.length <= 2} icon={<Minus size={17} color='#93c5fd' />} onPress={store.removeManualCutPoint} />
          <Action compact label='ভাগ করুন' primary icon={<Scissors size={17} color='#fff' />} onPress={store.executeManualDivide} />
        </ScrollView>
      </View>
    );
  }

  return <>
    {isMoreOpen && <View style={styles.morePanel}>
      {plots.length > 0 && <Action label='সেভ' active icon={<BookmarkCheck size={18} color='#fff' />} onPress={() => { setIsMoreOpen(false); onOpenSave(); }} />}
      <Action label='ড্রাইভ' icon={<HardDrive size={18} color='#94a3b8' />} onPress={() => void Linking.openURL('https://drive.google.com/drive/folders/1r0ryb1SyCeYV-41CM1WweokGDKT5t9RB')} />
      <Action label='কর্ণ' active={isShowDiagonals} icon={isShowDiagonals ? <Eye size={18} color='#fff' /> : <EyeOff size={18} color='#94a3b8' />} onPress={() => store.setIsShowDiagonals(!isShowDiagonals)} />
      <Action label='সাহায্য' icon={<HelpCircle size={18} color='#94a3b8' />} onPress={() => Alert.alert('ব্যবহার', 'ম্যাপ নিন → স্কেল সেট করুন → ক্রসহেয়ার কোণায় এনে পয়েন্ট যোগ করুন → শেষ করুন।')} />
      <Action label='রিসেট' danger disabled={!mapImage} icon={<RotateCcw size={18} color='#ef4444' />} onPress={resetMap} />
    </View>}
    <View style={styles.wrapper}>
      <Action label='ম্যাপ' icon={<ImageIcon size={18} color='#94a3b8' />} onPress={onOpenImagePicker} />
      <Action label='সেভড' icon={<FolderOpen size={18} color='#94a3b8' />} onPress={onOpenLoad} />
      <Action label='স্কেল' active={Boolean(scale)} icon={<Ruler size={18} color={scale ? '#fff' : '#fbbf24'} />} onPress={beginCalibration} />
      <Action label='আঁকুন' disabled={!mapImage || !scale} icon={<PenTool size={18} color='#94a3b8' />} onPress={store.startPlotDrawing} />
      <Action label='ভাগ' disabled={plots.length === 0} icon={<Scissors size={18} color='#94a3b8' />} onPress={store.startManualDivide} />
      <Action label='ম্যাগনিফাই' active={isMagnifierEnabled} icon={isMagnifierEnabled ? <SearchX size={18} color='#fff' /> : <Search size={18} color='#94a3b8' />} onPress={() => store.setIsMagnifierEnabled(!isMagnifierEnabled)} />
      <Action label='আরও' active={isMoreOpen} icon={<MoreHorizontal size={18} color={isMoreOpen ? '#fff' : '#94a3b8' />} onPress={() => setIsMoreOpen((open) => !open)} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', elevation: 12 },
  action: { minWidth: 43, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 9 },
  compactAction: { minWidth: 51, minHeight: 43, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 8 },
  active: { backgroundColor: '#2563eb' },
  primary: { backgroundColor: '#16a34a', paddingHorizontal: 9 },
  disabled: { opacity: 0.32 },
  actionLabel: { color: '#94a3b8', fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  compactActionLabel: { fontSize: 7.9 },
  white: { color: '#fff' },
  danger: { color: '#ef4444' },
  divideMessage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divideText: { color: '#e2e8f0', fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  divideWrapper: { position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', overflow: 'hidden', elevation: 12 },
  divideTop: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155', backgroundColor: '#111827' },
  divideTopInfo: { flex: 1 },
  divideHeading: { color: '#f8fafc', fontFamily: Fonts.headingSemiBold, fontSize: 10 },
  divideTopText: { marginTop: -1, color: '#94a3b8', fontFamily: Fonts.headingMedium, fontSize: 8.5 },
  targetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: '#1e3a8a' },
  targetText: { color: '#bfdbfe', fontFamily: Fonts.headingSemiBold, fontSize: 8.5 },
  divideActions: { alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 5 },
  morePanel: { position: 'absolute', bottom: 82, right: 8, zIndex: 21, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.98)', elevation: 14 },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BookmarkCheck, Calendar, FolderOpen, Layers, Search, Trash2, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { PLOT_COLOR_PALETTE } from '../../utils/canvas';
import type { PlotRecord, Point } from '../../types/map';
import type { TCalculation } from '../../../../types/calculation';
import { CalculationService } from '../../../../services/calculation-service';
import { ErrorToast, SuccessToast } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';
import { useThemeStore } from '../../../../stores/theme-store';
import { KeyboardSafeView, useModalSafeBottomPadding } from '../../../../components/common/keyboard-safe-layout';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';
import { useSavedCalculations } from '../../../../hooks/queries/use-calculations';
import { queryKeys } from '../../../../lib/query-keys';
import { LoadingSkeleton, useSkeletonPulse } from '../../../../components/ui/loading-skeleton';

export type ServerCalculation = TCalculation;

type Props = {
  visible: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
  onRequireMap: (calculation: ServerCalculation) => void;
};

function getErrorMessage(result: { success: boolean; message: string }, fallback: string) {
  return result.message || fallback;
}

export function applyServerCalculation(calculation: ServerCalculation) {
  const scale = calculation.scalePxPerUnit || null;
  const plots: PlotRecord[] = (calculation.plots || []).map((plot, index) => {
    let points: Point[] = [];
    if (Array.isArray(plot.points)) points = plot.points;
    else {
      try { points = JSON.parse(plot.points) as Point[]; } catch { points = []; }
    }
    const results = calculatePolygonData(points, scale) ?? {
      sqft: 0,
      shotok: Number(plot.areaShotok) || 0,
      katha: Number(plot.areaKatha) || 0,
      lengths: [],
      perimeter: 0,
    };
    return {
      id: plot.id || `${Date.now()}-${index}`,
      name: plot.plotNumber || `Plot ${index + 1}`,
      points,
      results,
      color: PLOT_COLOR_PALETTE[index % PLOT_COLOR_PALETTE.length],
    };
  });
  const store = useMapStore.getState();
  store.setScale(scale);
  store.setPlots(plots);
  store.setCurrentProjectId(calculation.id);
  SuccessToast(`“${calculation.name}” loaded on the canvas.`);
}

export function CalculationLibrarySheet({ visible, mode, onClose, onRequireMap }: Props) {
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const bottomPadding = useModalSafeBottomPadding();
  const queryClient = useQueryClient();
  const plots = useMapStore((state) => state.plots);
  const scale = useMapStore((state) => state.scale);
  const mapImage = useMapStore((state) => state.mapImage);
  const defaultName = useMemo(
    () => `Measurement — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    [],
  );
  const [name, setName] = useState(defaultName);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const libraryQuery = useSavedCalculations(
    debouncedSearch,
    visible && mode === 'load',
  );
  const items = useMemo(
    () => libraryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [libraryQuery.data],
  );
  const initialLoading = libraryQuery.isPending && items.length === 0;
  const skeletonOpacity = useSkeletonPulse(initialLoading || libraryQuery.isFetchingNextPage);

  const save = async () => {
    if (!name.trim()) { ErrorToast('Enter a name for this measurement.'); return; }
    if (!plots.length) { ErrorToast('Draw at least one plot before saving.'); return; }
    setSaving(true);
    try {
      const result = await CalculationService.saveCalculation({
        name: name.trim(),
        mapName: mapImage?.name || 'Map file',
        scaleType: 'link',
        scalePxPerUnit: scale || undefined,
        imageWidth: mapImage?.width,
        imageHeight: mapImage?.height,
        plots: plots.map((plot, index) => ({
          plotNumber: plot.name || `Plot ${index + 1}`,
          points: plot.points,
          areaSqLink: plot.results.sqft ? plot.results.sqft * 2.29568 : 0,
          areaShotok: plot.results.shotok || 0,
          areaKatha: plot.results.katha || 0,
        })),
      });
      if (!result.success) throw new Error(getErrorMessage(result, 'Could not save measurement.'));
      await queryClient.invalidateQueries({ queryKey: queryKeys.calculations.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
      SuccessToast(`“${name.trim()}” saved successfully.`);
      onClose();
    } catch (error) {
      ErrorToast(error instanceof Error ? error.message : 'Could not save measurement.');
    } finally {
      setSaving(false);
    }
  };

  const select = (calculation: ServerCalculation) => {
    if (!mapImage) { onRequireMap(calculation); onClose(); return; }
    applyServerCalculation(calculation);
    onClose();
  };

  const remove = (calculation: ServerCalculation) => Alert.alert(
    'Delete measurement?',
    'This measurement and all of its plots will be permanently deleted.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await CalculationService.deleteCalculation(calculation.id);
            if (!result.success) throw new Error(getErrorMessage(result, 'Could not delete measurement.'));

            queryClient.setQueriesData(
              { queryKey: queryKeys.calculations.libraryLists() },
              (current: any) => {
                if (!current?.pages) return current;
                return {
                  ...current,
                  pages: current.pages.map((page: any) => ({
                    ...page,
                    items: Array.isArray(page.items)
                      ? page.items.filter((item: ServerCalculation) => item.id !== calculation.id)
                      : page.items,
                  })),
                };
              },
            );
            await queryClient.invalidateQueries({ queryKey: queryKeys.calculations.lists() });
            await queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
            SuccessToast('Measurement deleted.');
          } catch (error) {
            ErrorToast(error instanceof Error ? error.message : 'Could not delete measurement.');
          }
        },
      },
    ],
  );

  const totalShotok = plots.reduce((sum, plot) => sum + plot.results.shotok, 0);
  const totalKatha = plots.reduce((sum, plot) => sum + plot.results.katha, 0);

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <KeyboardSafeView style={styles.keyboardAvoider}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.panel,
                borderColor: colors.panelBorder,
                paddingBottom: bottomPadding,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textStrong }]}>{mode === 'save' ? 'Save Measurement' : 'Saved Measurements'}</Text>
                <Text style={[styles.subtitle, { color: colors.textSoft }]}>{mode === 'save' ? 'Save the current map and plots to your profile' : 'Load a previous measurement back onto the canvas'}</Text>
              </View>
              <TouchableOpacity style={[styles.close, { backgroundColor: colors.panelRaised }]} onPress={onClose}><X size={18} color={colors.textSoft} /></TouchableOpacity>
            </View>

            {mode === 'save' ? (
              <ScrollView
                style={styles.saveScroll}
                contentContainerStyle={styles.saveContent}
                keyboardShouldPersistTaps='handled'
                keyboardDismissMode='on-drag'
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.summary, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]}>
                  <Text style={[styles.summaryLine, { color: colors.textStrong }]}>Map: {mapImage?.name || 'Map file'}</Text>
                  <Text style={[styles.summaryLine, { color: colors.textStrong }]}>Plots: {plots.length}</Text>
                  <Text style={[styles.total, { borderTopColor: colors.panelBorder, color: colors.success }]}>Total: {totalShotok.toFixed(2)} shotok ({totalKatha.toFixed(2)} katha)</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder='Measurement name'
                  placeholderTextColor={colors.textSoft}
                  returnKeyType='done'
                  onSubmitEditing={() => {
                    if (!saving && plots.length) void save();
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.panelBorder,
                      color: colors.textStrong,
                    },
                  ]}
                />
                <TouchableOpacity
                  disabled={saving || !plots.length}
                  style={[styles.primary, (saving || !plots.length) && styles.disabled]}
                  onPress={save}
                >
                  {saving ? (
                    <ActivityIndicator size='small' color='#fff' />
                  ) : (
                    <BookmarkCheck size={18} color='#fff' />
                  )}
                  <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : <>
              <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.panelBorder }]}><Search size={17} color={colors.textSoft} /><TextInput value={search} onChangeText={setSearch} placeholder='Search by measurement or map name' placeholderTextColor={colors.textSoft} style={[styles.searchInput, { color: colors.textStrong }]} /></View>

              {initialLoading ? (
                <View style={styles.skeletonList}>
                  {[0, 1, 2, 3].map((item) => (
                    <View key={`saved-skeleton-${item}`} style={[styles.item, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]}>
                      <View style={styles.itemBody}>
                        <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonTitle} />
                        <View style={styles.skeletonMetaRow}>
                          <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonMeta} />
                          <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonDate} />
                        </View>
                        <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonMap} />
                      </View>
                      <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonDelete} />
                    </View>
                  ))}
                </View>
              ) : libraryQuery.isError && items.length === 0 ? (
                <View style={styles.empty}>
                  <FolderOpen size={30} color={colors.textSoft} />
                  <Text style={[styles.emptyText, { color: colors.textSoft }]}>Could not load saved measurements</Text>
                  <TouchableOpacity style={styles.retry} onPress={() => void libraryQuery.refetch()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
                  keyboardShouldPersistTaps='handled'
                  keyboardDismissMode='on-drag'
                  onEndReached={() => {
                    if (libraryQuery.hasNextPage && !libraryQuery.isFetchingNextPage) {
                      void libraryQuery.fetchNextPage();
                    }
                  }}
                  onEndReachedThreshold={0.35}
                  ListFooterComponent={libraryQuery.isFetchingNextPage ? (
                    <View style={[styles.item, styles.footerSkeleton, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]}>
                      <View style={styles.itemBody}>
                        <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonTitle} />
                        <LoadingSkeleton opacity={skeletonOpacity} color={colors.panelRaised} style={styles.skeletonMap} />
                      </View>
                    </View>
                  ) : null}
                  ListEmptyComponent={<View style={styles.empty}><FolderOpen size={30} color={colors.textSoft} /><Text style={[styles.emptyText, { color: colors.textSoft }]}>{search ? 'No results found' : 'No saved measurements yet'}</Text></View>}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.item, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]} onPress={() => select(item)}>
                      <View style={styles.itemBody}>
                        <Text style={[styles.itemTitle, { color: colors.textStrong }]}>{item.name}</Text>
                        <View style={styles.meta}>
                          <Layers size={12} color={colors.success} />
                          <Text style={[styles.metaText, { color: colors.textSoft }]}>{item.plots?.length || 0} plots</Text>
                          <Calendar size={12} color={colors.textSoft} />
                          <Text style={[styles.metaText, { color: colors.textSoft }]}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.mapName, { color: colors.textSoft }]}>🗺️ {item.mapName || 'Map file'}</Text>
                      </View>
                      <TouchableOpacity style={styles.delete} onPress={(event) => { event.stopPropagation(); remove(item); }}><Trash2 size={17} color='#ef4444' /></TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>}
          </View>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', padding: 16, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  headerText: { flex: 1 },
  title: { fontFamily: Fonts.headingBold, fontSize: 17 },
  subtitle: { fontFamily: Fonts.sansRegular, fontSize: 10 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  saveScroll: { flexShrink: 1 },
  saveContent: { flexGrow: 1 },
  summary: { gap: 5, padding: 13, borderRadius: 11, borderWidth: 1 },
  summaryLine: { fontFamily: Fonts.headingMedium, fontSize: 11 },
  total: { marginTop: 3, paddingTop: 7, borderTopWidth: StyleSheet.hairlineWidth, fontFamily: Fonts.headingBold, fontSize: 12 },
  input: { height: 45, marginTop: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, fontFamily: Fonts.headingMedium },
  primary: { height: 45, marginTop: 12, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#16a34a' },
  primaryText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 12 },
  disabled: { opacity: 0.4 },
  searchBox: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontFamily: Fonts.headingMedium, fontSize: 11 },
  list: { marginTop: 10 },
  listContent: { gap: 9, paddingBottom: 8 },
  emptyContent: { flexGrow: 1 },
  empty: { alignItems: 'center', gap: 7, paddingVertical: 45 },
  emptyText: { fontFamily: Fonts.headingMedium, fontSize: 11 },
  retry: { marginTop: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#16a34a' },
  retryText: { color: '#fff', fontFamily: Fonts.headingSemiBold, fontSize: 10.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  itemBody: { flex: 1 },
  itemTitle: { fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  meta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { marginRight: 7, fontSize: 9 },
  mapName: { marginTop: 3, fontSize: 9 },
  delete: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)' },
  skeletonList: { marginTop: 10, gap: 9 },
  skeletonTitle: { width: '40%', height: 12 },
  skeletonMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  skeletonMeta: { width: 66, height: 9 },
  skeletonDate: { width: 78, height: 9 },
  skeletonMap: { width: '52%', height: 9, marginTop: 7 },
  skeletonDelete: { width: 34, height: 34, borderRadius: 8 },
  footerSkeleton: { marginTop: 9 },
});

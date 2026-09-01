import type { MapMode, Point, PlotRecord } from './map';
import type React from 'react';

export type SidebarControlsProps = {
  selectedFile: File | null;
  image: HTMLImageElement | null;
  mode: MapMode;
  setMode: (mode: MapMode) => void;
  scale: number | null;
  manualScale: string;
  setManualScale: (s: string) => void;
  showManualScale: boolean;
  setShowManualScale: (s: boolean) => void;
  calibrationLine: number[];
  setCalibrationLine: (l: number[]) => void;
  plotPoints: Point[];
  setPlotPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  plots: PlotRecord[];
  plotSaveName: string;
  setPlotSaveName: (s: string) => void;
  setIsDrawing: (d: boolean) => void;
  setIsModalOpen: (o: boolean) => void;
  setSnapHint: (h: boolean) => void;
  clearPlot: () => void;
  startPlotDrawing: () => void;
  undoLastPlot: () => void;
  savePlotsToLibrary: () => void;
  finishPlot: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearFile: () => void;
  handleManualScaleSubmit: (e: React.FormEvent) => void;
  handlePrint: () => void;
  resetCalibClick: () => void;
};

export type SidebarImagePanelProps = {
  selectedFile: File | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmClearMap: () => void;
};

export type SidebarCalibrationPanelProps = {
  mode: MapMode;
  setMode: (mode: MapMode) => void;
  image: HTMLImageElement | null;
  scale: number | null;
  manualScale: string;
  setManualScale: (s: string) => void;
  showManualScale: boolean;
  setShowManualScale: (s: boolean) => void;
  confirmClearPlot: (callback?: () => void) => void;
  setIsDrawing: (d: boolean) => void;
  calibrationLine: number[];
  setCalibrationLine: (l: number[]) => void;
  resetCalibClick: () => void;
  handleManualScaleSubmit: (e: React.FormEvent) => void;
  setIsModalOpen: (o: boolean) => void;
};

export type SidebarPlottingPanelProps = {
  mode: MapMode;
  setMode: (mode: MapMode) => void;
  image: HTMLImageElement | null;
  scale: number | null;
  plots: PlotRecord[];
  plotPoints: Point[];
  setPlotPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  plotSaveName: string;
  setPlotSaveName: (s: string) => void;
  setIsDrawing: (d: boolean) => void;
  setSnapHint: (h: boolean) => void;
  startPlotDrawing: () => void;
  undoLastPlot: () => void;
  confirmClearPlot: (callback?: () => void) => void;
  finishPlot: () => void;
  savePlotsToLibrary: () => void;
};

export type SidebarActionsPanelProps = {
  mode: MapMode;
  handlePrint: () => void;
};

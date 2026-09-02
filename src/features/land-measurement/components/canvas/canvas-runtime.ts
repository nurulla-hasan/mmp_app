import { makeMutable } from 'react-native-reanimated';
import { useMapStore } from '../../store/useMapStore';
import type { Point } from '../../types/map';

export type CanvasRuntimeTransform = { scale: number; pos: Point };

/**
 * These mutables are the single transient transform used by the Skia scene.
 * Gesture worklets write to them directly on the UI thread. A toolbar press may
 * synchronously read them once, which lets point placement use the exact live
 * crosshair position without waiting for the pan gesture to finish.
 */
export const canvasRuntimeScale = makeMutable(1);
export const canvasRuntimeX = makeMutable(0);
export const canvasRuntimeY = makeMutable(0);

export function setCanvasRuntimeTransform(scale: number, x: number, y: number) {
  canvasRuntimeScale.value = scale;
  canvasRuntimeX.value = x;
  canvasRuntimeY.value = y;
}

export function getCanvasRuntimeTransform(): CanvasRuntimeTransform {
  return {
    scale: canvasRuntimeScale.value,
    pos: { x: canvasRuntimeX.value, y: canvasRuntimeY.value },
  };
}

export function syncCanvasRuntimeTransformToStore() {
  const runtimeTransform = getCanvasRuntimeTransform();
  const current = useMapStore.getState();
  const sameScale = Math.abs(current.stageScale - runtimeTransform.scale) < 1e-6;
  const sameX = Math.abs(current.stagePos.x - runtimeTransform.pos.x) < 1e-4;
  const sameY = Math.abs(current.stagePos.y - runtimeTransform.pos.y) < 1e-4;
  if (!sameScale || !sameX || !sameY) {
    current.setStageTransform(runtimeTransform);
  }
  return runtimeTransform;
}

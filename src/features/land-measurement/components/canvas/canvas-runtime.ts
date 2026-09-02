import { useMapStore } from '../../store/useMapStore';
import type { Point } from '../../types/map';

export type CanvasRuntimeTransform = { scale: number; pos: Point };

let runtimeTransform: CanvasRuntimeTransform = {
  scale: 1,
  pos: { x: 0, y: 0 },
};

export function setCanvasRuntimeTransform(scale: number, x: number, y: number) {
  runtimeTransform = { scale, pos: { x, y } };
}

export function getCanvasRuntimeTransform(): CanvasRuntimeTransform {
  return runtimeTransform;
}

/**
 * Gesture-driven transforms live on the UI thread while the finger is down.
 * Toolbar actions call this first so a point is added at the exact live
 * crosshair position even before the gesture has ended and Zustand is committed.
 */
export function syncCanvasRuntimeTransformToStore() {
  const current = useMapStore.getState();
  const sameScale = Math.abs(current.stageScale - runtimeTransform.scale) < 1e-6;
  const sameX = Math.abs(current.stagePos.x - runtimeTransform.pos.x) < 1e-4;
  const sameY = Math.abs(current.stagePos.y - runtimeTransform.pos.y) < 1e-4;
  if (!sameScale || !sameX || !sameY) {
    current.setStageTransform(runtimeTransform);
  }
  return runtimeTransform;
}

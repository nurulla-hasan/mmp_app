import type Konva from 'konva';
import type React from 'react';

export type KonvaStageProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
};

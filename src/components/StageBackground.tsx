import type { CSSProperties, ReactNode } from 'react';
import type { LifeStage } from '../types/game';
import { LIFE_STAGE_BACKGROUNDS } from '../utils/gameLogic';

interface StageBackgroundProps {
  stage: LifeStage;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** 現在のプレイヤーが立っている人生ステージに応じて、画面全体の雰囲気（背景グラデーション）を変える薄いラッパー。 */
function StageBackground({ stage, className, style, children }: StageBackgroundProps) {
  return (
    <div className={className} style={{ background: LIFE_STAGE_BACKGROUNDS[stage], ...style }}>
      {children}
    </div>
  );
}

export default StageBackground;

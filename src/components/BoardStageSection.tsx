import type { LifeStage } from '../types/game';
import { getBoardStageTheme } from '../utils/gameLogic';

interface BoardStageSectionProps {
  stage: LifeStage;
  top: number;
  height: number;
}

// 装飾絵文字を帯の中に薄く散らすための、決定的な（毎回同じ）疑似ランダム位置。
function scatterPosition(seed: number): { left: string; top: string } {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const y = Math.sin(seed * 78.233) * 12345.678;
  const left = 10 + ((x - Math.floor(x)) * 80);
  const top = 15 + ((y - Math.floor(y)) * 70);
  return { left: `${left}%`, top: `${top}%` };
}

/** 盤面上に敷く「年代エリア」の帯。座標ベースのボード上に絶対配置で敷かれる背景層。 */
function BoardStageSection({ stage, top, height }: BoardStageSectionProps) {
  const theme = getBoardStageTheme(stage);

  return (
    <div className="board-stage-band" style={{ top, height, background: theme.gradient }}>
      {theme.decorations.map((decoration, i) => (
        <span
          key={i}
          className="board-stage-band__scatter"
          style={scatterPosition(i + stage.length)}
          aria-hidden="true"
        >
          {decoration}
        </span>
      ))}
      <div className="board-stage-band__label">
        <span className="board-stage-band__decorations" aria-hidden="true">
          {theme.decorations.join(' ')}
        </span>
        <span className="board-stage-band__title">{theme.title}</span>
        <span className="board-stage-band__age">{theme.ageRangeLabel}</span>
      </div>
    </div>
  );
}

export default BoardStageSection;

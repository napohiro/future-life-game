import type { EraId } from '../types/game';

interface BoardAreaCardProps {
  title: string;
  ageLabel: string;
  icon: string;
  /** カードの基準となるマス目のy座標（px）。カードはこの少し上に、下端を合わせて浮かぶ。 */
  y: number;
  isCurrent: boolean;
  era: EraId;
}

/** 盤面上に浮かぶ「エリア見出しカード」。該当エリアの開始マスの少し上に、
 * マスを隠しすぎない程度に重ねて配置する（GameBoard側でyを計算して渡す）。 */
function BoardAreaCard({ title, ageLabel, icon, y, isCurrent, era }: BoardAreaCardProps) {
  return (
    <div
      className={`board-area-card board-area-card--${era} ${isCurrent ? 'board-area-card--current' : ''}`}
      style={{ top: y }}
      aria-hidden="true"
    >
      <div className="board-area-card__body">
        {isCurrent && <span className="board-area-card__current-tag">📍現在地</span>}
        <div className="board-area-card__heading">
          <span className="board-area-card__icon">{icon}</span>
          <span className="board-area-card__title">{title}</span>
        </div>
        <span className="board-area-card__age">{ageLabel}</span>
      </div>
      <span className="board-area-card__pointer" />
    </div>
  );
}

export default BoardAreaCard;

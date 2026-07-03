import type { BranchPoint, LifeStage } from '../types/game';
import { getBoardStage } from './gameLogic';

// ============================================================
// 盤面の座標生成（Ver.2：曲がる・分岐する一本道）
// ------------------------------------------------------------
// 120マスの直列データ（position 0〜119）はそのまま維持しつつ、
// 表示用のx,y座標だけをここで計算する。ゲームロジック（年代別イベント制御・
// ルーレット・コマ移動など）は一切参照しないので、見た目をどう変えても
// 既存ロジックには影響しない。
// ============================================================

export interface BoardPathPoint {
  position: number;
  x: number; // 0〜100（盤面幅に対するパーセント）
  y: number; // px
  stage: LifeStage;
}

export interface StagePathBand {
  stage: LifeStage;
  top: number;
  height: number;
}

export interface BranchNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

export interface BranchDecoration {
  branchId: string;
  originX: number;
  originY: number;
  nodes: BranchNode[];
}

const COLUMNS: number = 6;
export const ROW_HEIGHT = 74;
const MARGIN_X = 15;
const CURVE_AMPLITUDE = 9;
const WOBBLE_AMPLITUDE = 3;
// x座標(0〜100の%)からおおよその角度を計算するために仮定する盤面の実幅(px)。
// 実測はできないため、スマホ想定の目安値を使う（矢印の向きを大まかに合わせるための近似）。
const ASSUMED_BOARD_WIDTH_PX = 340;

/** マス位置(0〜boardSize-1)から表示用のx,y座標を生成する。曲がりくねった一本道になるよう、
 * 行ごとの折り返し（蛇行）に加えて、行内でも緩くカーブするようサイン波で座標を揺らしている。 */
export function generateBoardPath(boardSize: number): BoardPathPoint[] {
  const usableWidth = 100 - MARGIN_X * 2;
  const points: BoardPathPoint[] = [];

  for (let position = 0; position < boardSize; position += 1) {
    const row = Math.floor(position / COLUMNS);
    const colInRow = position % COLUMNS;
    const reversed = row % 2 === 1;
    const effectiveCol = reversed ? COLUMNS - 1 - colInRow : colInRow;
    const colFraction = COLUMNS === 1 ? 0.5 : effectiveCol / (COLUMNS - 1);

    const baseX = MARGIN_X + colFraction * usableWidth;
    const wobble = Math.sin(position * 0.4) * WOBBLE_AMPLITUDE;
    const curveSign = row % 2 === 0 ? 1 : -1;
    const withinRowCurve = Math.sin(colFraction * Math.PI) * CURVE_AMPLITUDE * curveSign;

    const x = Math.min(97, Math.max(3, baseX + wobble));
    const y = row * ROW_HEIGHT + ROW_HEIGHT / 2 + withinRowCurve;

    points.push({ position, x, y, stage: getBoardStage(position) });
  }

  return points;
}

/** 各人生ステージが占めるy範囲（帯）を計算する。ステージごとの背景エリアの描画に使う。 */
export function generateStagePath(points: BoardPathPoint[]): StagePathBand[] {
  const order: LifeStage[] = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'];
  const bands: StagePathBand[] = [];

  order.forEach((stage) => {
    const stagePoints = points.filter((p) => p.stage === stage);
    if (stagePoints.length === 0) return;
    const ys = stagePoints.map((p) => p.y);
    const top = Math.min(...ys) - ROW_HEIGHT / 2 - 8;
    const bottom = Math.max(...ys) + ROW_HEIGHT / 2 + 8;
    bands.push({ stage, top, height: bottom - top });
  });

  return bands;
}

/** マス中心点を滑らかにつなぐSVGパス文字列を作る（Catmull-Rom→ベジェ変換）。 */
export function buildSmoothPathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

/** 分岐点（BranchPoint）の装飾用に、本道から少し離れた位置に3本程度の枝道ノードを配置する。
 * 見た目だけの装飾で、実際のマス進行には影響しない。 */
export function generateBranchDecorations(
  branchPoints: BranchPoint[],
  boardPoints: BoardPathPoint[],
): BranchDecoration[] {
  return branchPoints.map((bp) => {
    const origin = boardPoints.find((p) => p.position === bp.position);
    const originX = origin?.x ?? 50;
    const originY = origin?.y ?? 0;
    const spread = 15;
    const routeCount = bp.routes.length;

    const nodes: BranchNode[] = bp.routes.map((route, i) => {
      const offset = (i - (routeCount - 1) / 2) * spread;
      return {
        id: route.id,
        label: route.name,
        icon: route.icon,
        x: Math.min(96, Math.max(4, originX + offset)),
        y: originY + ROW_HEIGHT * 0.9,
      };
    });

    return { branchId: bp.id, originX, originY, nodes };
  });
}

export interface DirectionArrow {
  position: number;
  x: number;
  y: number;
  angleDeg: number;
}

/** 道の流れが分かるよう、一定間隔で小さな矢印マーカーの位置・向きを計算する。 */
export function generateDirectionArrows(points: BoardPathPoint[], interval = 10): DirectionArrow[] {
  const arrows: DirectionArrow[] = [];
  for (let i = interval; i < points.length - 1; i += interval) {
    const current = points[i];
    const next = points[i + 1];
    const dxPx = ((next.x - current.x) / 100) * ASSUMED_BOARD_WIDTH_PX;
    const dyPx = next.y - current.y;
    const angleDeg = Math.atan2(dyPx, dxPx) * (180 / Math.PI);
    arrows.push({ position: current.position, x: current.x, y: current.y, angleDeg });
  }
  return arrows;
}

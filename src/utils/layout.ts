/**
 * layout.ts — 编辑器布局显式常量
 *
 * 所有 Beat/KeyPad 的尺寸、间距都在此定义，
 * 方便统一调试。
 */

/** ══════════════════════════════════════════
 *  BeatView 布局（1.25×）
 * ══════════════════════════════════════════ */
export const BEAT = {
  /** 圆点直径 (px) */
  DOT_SIZE: 7,
  /** 圆点行内间距 (px) */
  DOT_GAP: 3,
  /** 圆点行间间距 (px) */
  ROW_GAP: 3,
  /** 内边距 (px) */
  PADDING_Y: 6,
  PADDING_X: 8,
  /** 边框宽度 (px) */
  BORDER: 2,
  /** 标签与网格间距 (px) */
  LABEL_GAP: 4,
  /** 标签字号 (px) */
  LABEL_FONT_SIZE: 11,

  /* ── 派生计算（只读） ── */

  get DOT_ROW_WIDTH(): number {
    return this.DOT_SIZE * 12 + this.DOT_GAP * 11
  },
  get DOT_GRID_HEIGHT(): number {
    return this.DOT_SIZE * 3 + this.ROW_GAP * 2
  },
  get WIDTH(): number {
    return this.DOT_ROW_WIDTH + this.PADDING_X * 2 + this.BORDER * 2
  },
  get HEIGHT(): number {
    return (
      this.LABEL_FONT_SIZE +
      this.LABEL_GAP +
      this.DOT_GRID_HEIGHT +
      this.PADDING_Y * 2 +
      this.BORDER * 2
    )
  },
} as const

/** ══════════════════════════════════════════
 *  SheetsView 布局（1.25×）
 * ══════════════════════════════════════════ */
export const SHEETS = {
  BEAT_GAP: 5,
  ROW_GAP: 5,
  NAV_WIDTH: 28,
  NAV_GAP: 5,
  SLOT_PADDING: 1,
} as const

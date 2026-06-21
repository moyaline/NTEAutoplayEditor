/**
 * layout.ts — 编辑器布局显式常量
 */
export const BEAT = {
  DOT_SIZE: 7,
  DOT_GAP: 3,
  ROW_GAP: 3,
  PADDING_Y: 6,
  PADDING_X: 8,
  BORDER: 2,
  LABEL_GAP: 4,
  LABEL_FONT_SIZE: 11,

  /* ── 派生计算 ── */

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

export const BEAT_MOBILE = {
  DOT_SIZE: 7,
  DOT_GAP: 3,
  ROW_GAP: 3,
  PADDING_Y: 3,
  PADDING_X: 4,
  BORDER: 1,
  LABEL_GAP: 2,
  LABEL_FONT_SIZE: 11,

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

export const SHEETS = {
  BEAT_GAP: 5,
  ROW_GAP: 5,
  NAV_WIDTH: 28,
  NAV_GAP: 5,
  SLOT_PADDING: 1,
} as const

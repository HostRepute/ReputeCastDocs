/** Numbered callouts on screenshots: element boxes converted to percentages of the captured area. */

export type Box = { x: number; y: number; width: number; height: number }
/**
 * Where a marker's number sits: outside the box on one side, lined up with the start of that side (its top, or its
 * left) or with its end (`-end`), or inside the box's top-left corner.
 */
export type BadgeSide =
  'left' | 'left-end' | 'top' | 'top-end' | 'right' | 'right-end' | 'bottom' | 'bottom-end' | 'inside'
export type Marker = { n: number; x: number; y: number; w: number; h: number }
/** The `<id>.json` file written beside a screenshot that has markers. */
export type MarkerFile = { width: number; height: number; markers: Marker[] }

const pct = (v: number, total: number) => Math.round(Math.min(Math.max(v / total, 0), 1) * 10_000) / 100

/**
 * Converts `box` (CSS px, same origin as `area`) to percentages of `area`, clipped to it and rounded to
 * 0.01%. A box at x=144 in a 1440 px wide area starts at 10%.
 */
export function toMarker(n: number, box: Box, area: Box): Marker {
  const left = box.x - area.x
  const top = box.y - area.y
  const x = pct(left, area.width)
  const y = pct(top, area.height)
  return {
    n,
    x,
    y,
    w: Math.round((pct(left + box.width, area.width) - x) * 100) / 100,
    h: Math.round((pct(top + box.height, area.height) - y) * 100) / 100,
  }
}

/**
 * Room a number needs beside its box, in percent of the image width. Screenshot.astro draws the number at
 * clamp(18px, 3.3% of the width, 24px) plus a 3 px gap: at most 6% of a 360 px wide figure.
 */
export const BADGE_ROOM = 6

/**
 * The side a marker's number goes on: `chosen` (the manifest's `badge`, for a number that would land on something
 * the reader needs), else the first side with room (left, top, right, bottom), else inside the corner.
 * `aspect` = width / height of the image.
 */
export function badgeSide(m: Marker, aspect: number, chosen?: BadgeSide): BadgeSide {
  if (chosen) return chosen
  const roomY = BADGE_ROOM * aspect
  if (m.x >= BADGE_ROOM) return 'left'
  if (m.y >= roomY) return 'top'
  if (m.x + m.w <= 100 - BADGE_ROOM) return 'right'
  if (m.y + m.h <= 100 - roomY) return 'bottom'
  return 'inside'
}

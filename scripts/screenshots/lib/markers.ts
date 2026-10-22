/** Numbered callouts on screenshots: element boxes converted to percentages of the captured area. */

export type Box = { x: number; y: number; width: number; height: number }
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

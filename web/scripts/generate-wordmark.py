#!/usr/bin/env python3
"""
Regenerate src/components/WesleygramWordmark.tsx from the Billabong font.

Shapes the text with HarfBuzz (so GPOS kerning matches real browser/OS
rendering exactly), extracts the glyph outlines as SVG paths, and writes a
React component with a tight ink-box viewBox. Run only if the wordmark text
or the font ever changes:

    pip install fonttools uharfbuzz
    python scripts/generate-wordmark.py path/to/Billabong.ttf

Billabong (Type Associates / Russell Bean) is the typeface the Instagram
wordmark is based on; it is distributed as freeware for personal use, which
covers this personal project.
"""
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

TEXT = "Wesleygram"
OUT = Path(__file__).resolve().parent.parent / "src" / "components" / "WesleygramWordmark.tsx"

def main(font_path: str) -> None:
    blob = hb.Blob.from_file_path(font_path)
    face = hb.Face(blob)
    hbfont = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(TEXT)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf)

    tf = TTFont(font_path)
    order = tf.getGlyphOrder()
    gs = tf.getGlyphSet()

    paths: list[str] = []
    bounds = None
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gname = order[info.codepoint]
        t = Transform(1, 0, 0, 1, x + pos.x_offset, pos.y_offset)
        pen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(pen, t))
        if pen.getCommands():
            paths.append(pen.getCommands())
        bp = BoundsPen(gs)
        gs[gname].draw(TransformPen(bp, t))
        if bp.bounds:
            b = bp.bounds
            bounds = b if bounds is None else (
                min(bounds[0], b[0]), min(bounds[1], b[1]),
                max(bounds[2], b[2]), max(bounds[3], b[3]),
            )
        x += pos.x_advance

    assert bounds is not None
    xmin, ymin, xmax, ymax = (round(v) for v in bounds)
    w, h = xmax - xmin, ymax - ymin
    combined = " ".join(paths)

    tsx = f'''/**
 * The Wesleygram wordmark — exact vector outlines of "Wesleygram" set in
 * Billabong (the typeface the Instagram logo is based on), shaped with
 * HarfBuzz and extracted from the font at build time. Rendering it as an
 * inline SVG (the same way Instagram serves its own wordmark) makes it
 * pixel-identical everywhere, themeable via currentColor, and costs the
 * client no font download.
 *
 * Regenerate with scripts/generate-wordmark.py if the text ever changes.
 */
export function WesleygramWordmark({{ className }}: {{ className?: string }}) {{
  return (
    <svg
      viewBox="0 0 {w} {h}"
      className={{className}}
      role="img"
      aria-label="Wesleygram"
      fill="currentColor"
    >
      <g transform="matrix(1 0 0 -1 {-xmin} {ymax})">
        <path d="{combined}" />
      </g>
    </svg>
  );
}}
'''
    OUT.write_text(tsx, encoding="utf-8", newline="\n")
    print(f"wrote {OUT} (viewBox 0 0 {w} {h})")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/generate-wordmark.py path/to/Billabong.ttf")
    main(sys.argv[1])

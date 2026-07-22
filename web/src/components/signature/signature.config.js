/**
 * wesleygram.com — the Instagram remake.
 * Derived from the kit's sites/wesleygram.config.js. Colors/font match the
 * Wesleygram variant on wesleykamau.com, so the exit-close there and the
 * arrival intro here are the same look.
 *
 * Font handling (FABLE_INSTRUCTIONS.md → Step 3, hard no-swap guarantee):
 * the site loads "Instagram Sans" through next/font/local, which registers
 * it under a hashed family name — so document.fonts.load("'Instagram Sans'")
 * can't find it and the wordmark would swap to a system fallback. To match
 * what wesleykamau.com does, the Bold face is subsetted to just the wordmark
 * glyphs and inlined as "wks-mark" (see the <style> in app/layout.tsx).
 * "wks-mark" is prepended to the stack and registered via `fonts` so the
 * curtain gates on it and paints the wordmark in the real face, no swap.
 * `signatures` is injected separately by SignatureCurtain.jsx — never set it.
 */
export const SIGNATURE_CONFIG = {
  name: "Wesleygram",
  paper: "#171717",
  ink: "#ffffff",
  font: "'wks-mark', 'Instagram Sans', -apple-system, system-ui, sans-serif",
  fonts: { Wesleygram: { family: "wks-mark", weight: 700 } },
  reveal: "up",
  minHold: 1875,
  domains: ["wesleykamau.com", "wesleygram.com"],
};

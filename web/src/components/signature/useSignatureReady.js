"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` once the signature curtain has fully revealed the page.
 * Use it to gate entrance animations (hero cascades, staggered reveals) so
 * they don't play invisibly behind the sheet.
 *
 * Resolves immediately (next frame) when no curtain is installed or it has
 * already revealed, and has a safety fallback so it can never hang.
 */
export function useSignatureReady(fallbackMs = 6500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const api = window.__wkSignature;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    if (!api || (typeof api.revealed === "function" && api.revealed())) {
      const id = requestAnimationFrame(go);
      return () => cancelAnimationFrame(id);
    }

    if (typeof api.whenRevealed === "function") api.whenRevealed(go);
    document.addEventListener("wk-signature:reveal", go, { once: true });
    const t = window.setTimeout(go, fallbackMs);

    return () => {
      document.removeEventListener("wk-signature:reveal", go);
      clearTimeout(t);
    };
  }, [fallbackMs]);

  return ready;
}

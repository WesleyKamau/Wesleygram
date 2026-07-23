import { SIGNATURE_CONFIG } from "./signature.config";

/**
 * SignatureCurtain — Wesley Kamau's signature loading screen, for Next.js.
 *
 * LINKED MODE: the engine and the signature data are hot-linked from
 * wesleykamau.com — the single source of truth. When Wesley records new
 * signatures or the engine is improved, this site picks the changes up
 * automatically (edge cache revalidates within minutes). Nothing to update
 * in this repo, ever; only the tiny per-site config below lives here.
 *
 * Every tag is SYNCHRONOUS and must render inside <head>, so the curtain
 * exists before the very first paint (no flash of unstyled page). Order
 * matters: config → data → data-fallback guard → engine → engine-fallback
 * guard. The document.write guards load the vendored local copies
 * (public/signatures-fallback.js, public/wk-signature.js) only if
 * wesleykamau.com is unreachable, so the site degrades gracefully.
 *
 * No node APIs — safe on the edge runtime and in pages/_document.
 */

const HUB = "https://wesleykamau.com/signature";

export function SignatureCurtain() {
  // <-escape so no "<" in the JSON can ever terminate the inline tag.
  const config = JSON.stringify(SIGNATURE_CONFIG).replace(/</g, "\\u003c");
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: `window.WK_SIGNATURE=${config};` }}
      />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src={`${HUB}/signatures.js`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.WK_SIGNATURES||document.write('<script src="/signatures-fallback.js"><\\/script>');`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src={`${HUB}/wk-signature.js`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__wkSignature||document.write('<script src="/wk-signature.js"><\\/script>');`,
        }}
      />
    </>
  );
}

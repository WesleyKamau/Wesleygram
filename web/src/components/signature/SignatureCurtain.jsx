import fs from "node:fs";
import path from "node:path";
import { SIGNATURE_CONFIG } from "./signature.config";
import { WESLEY_SIGNATURES } from "./signatures";

/**
 * SignatureCurtain — Wesley Kamau's signature loading screen, for Next.js.
 *
 * Renders the canonical wk-signature.js INLINE and SYNCHRONOUSLY so the
 * curtain exists before the very first paint (no flash of unstyled page).
 * This is a Server Component (uses node:fs) — render it inside <head> of the
 * root layout (App Router) or inside <Head> of pages/_document (Pages Router).
 *
 * Requirements:
 *   - wk-signature.js copied to  public/wk-signature.js
 *   - signature.config.js next to this file (this site's name/colors/domains)
 *   - signatures.js next to this file (Wesley's handwriting — do not edit)
 *
 * The root layout must NOT run on the edge runtime (node:fs). If it does,
 * see FABLE_INSTRUCTIONS.md → "Edge runtime fallback".
 */

const SCRIPT_PATH = path.join(process.cwd(), "public", "wk-signature.js");

let cachedSource = null;

function getSource() {
  // Re-read on every render in dev so edits to the public file show up.
  if (cachedSource === null || process.env.NODE_ENV !== "production") {
    try {
      cachedSource = fs.readFileSync(SCRIPT_PATH, "utf8");
    } catch {
      cachedSource = "";
    }
  }
  return cachedSource;
}

export function SignatureCurtain() {
  // A literal "</script" anywhere in the payload would terminate the inline
  // tag early and dump the rest of the file into the page as text.
  const source = getSource().replace(/<\/script/gi, "<\\/script");
  const config = JSON.stringify({
    ...SIGNATURE_CONFIG,
    signatures: WESLEY_SIGNATURES,
  }).replace(/</g, "\\u003c");

  if (!source) {
    // File missing from the server bundle: fall back to a synchronous
    // same-origin request. Still render-blocking in <head>, so the no-flash
    // guarantee holds — at the cost of one request.
    return (
      <>
        <script
          dangerouslySetInnerHTML={{ __html: `window.WK_SIGNATURE=${config};` }}
        />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/wk-signature.js" />
      </>
    );
  }

  return (
    <script
      id="wk-signature-script"
      dangerouslySetInnerHTML={{
        __html: `window.WK_SIGNATURE=${config};\n${source}`,
      }}
    />
  );
}

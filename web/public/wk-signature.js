/*!
 * wk-signature v3.4.0
 * Wesley Kamau's cross-domain signature loading screen.
 *
 * On every full page load a branded sheet covers the page while Wesley's
 * handwritten signature draws itself in — the signature IS the loading
 * indicator (it finishes as the page becomes ready), and the mark makes
 * every site instantly identifiable as his. A matching transition plays
 * when navigating between his domains, so the hop reads as one continuous
 * move instead of a page refresh.
 *
 * Drop-in usage (any site, any stack) — MUST be a synchronous script in
 * <head> so the sheet exists before first paint:
 *
 *   <script src="/wk-signature.js"
 *           data-domains="wesleykamau.com,other-domain.com"><\/script>
 *
 * Or configure via a global set before the script runs:
 *
 *   <script>window.WK_SIGNATURE = { domains: ["wesleykamau.com"] };<\/script>
 *   <script src="/wk-signature.js"><\/script>
 *
 * (The "<\/script>" escapes above keep this file safe to inline into a
 * <script> tag — write them as normal closing tags in your HTML.)
 *
 * Options (data-* attribute or WK_SIGNATURE key):
 *   name     project wordmark              (default "Wesley Kamau")
 *   paper    sheet color                   (default "#093b3f")
 *   ink      wordmark + signature color    (default "#f4f1e8")
 *   font     wordmark font-family stack    (default: SF Pro Display stack)
 *   reveal   transition style: "up" (sheet lifts) | "split" (barn-door
 *            halves part) | "iris" (implodes to center). Default "up".
 *            Applied consistently to every load and hop.
 *   minHold  min ms the signature holds before revealing, even if the page
 *            is already loaded (default 1500) — keeps the moment uniform.
 *   domains  comma list (or array) of owned hosts; links to them get the
 *            exit transition. Subdomains match automatically.
 *   signatures (WK_SIGNATURE only) array of {viewBox, paths[], weight,
 *            timing?} — Wesley's real signatures; one is picked at random per
 *            session (kept across hops). Optional per-stroke timing
 *            {start,dur,pace} plays each back at his real writing pace.
 *   variants (WK_SIGNATURE only) array of per-path/per-host look overrides.
 *
 * Per-link overrides:
 *   <a data-signature ...>     force the exit transition (any destination)
 *   <a data-no-signature ...>  never transition this link
 *
 * Programmatic API: window.__wkSignature = { replay(mode, look?),
 *   close(url?, look?), settle(look?), destroy(), variantFor(url), current(),
 *   revealed(), whenRevealed(cb), hold(), timings, config, version }. `look`
 *   may be a variant entry OR any {name, paper, ink, font, reveal, ...} object
 *   (used by the debug gallery). hold() returns a release() that defers the
 *   reveal until called.
 *
 * Reveal signal: the moment the curtain has fully lifted, a
 * `wk-signature:reveal` CustomEvent fires on `document` and any whenRevealed()
 * callbacks run (revealed() reports whether that has happened). Gate entrance
 * animations on this so they don't play behind the sheet.
 *
 * Waiting for critical content: the reveal holds until the DOM is ready, the
 * signature has drawn (>= minHold), AND every <img data-wk-wait> in the page
 * has loaded. For anything else (a game's first frame, a canvas), call
 * `var release = window.__wkSignature.hold()` and invoke `release()` when
 * ready. All of this is bounded by a hard cap (~5s) so the curtain can never
 * trap the visitor, and it never blocks the page's own loading (pure overlay).
 */
(function () {
  "use strict";

  // Never double-run, never run inside iframes/embeds.
  if (window.__wkSignature) return;
  if (window.top !== window) return;

  var doc = document;
  var script = doc.currentScript;
  var user = window.WK_SIGNATURE || {};

  function option(name, fallback) {
    var v = script && script.getAttribute("data-" + name);
    if (v !== null && v !== undefined && v !== "") return v;
    if (user[name] !== undefined && user[name] !== null) return user[name];
    return fallback;
  }

  function safeColor(value, fallback) {
    return /^[#a-zA-Z0-9(),.%\s-]+$/.test(String(value)) ? value : fallback;
  }

  var REVEAL_STYLES = { up: 1, split: 1, iris: 1 };
  function normalizeReveal(v) {
    v = String(v || "").toLowerCase();
    return REVEAL_STYLES[v] ? v : "up";
  }

  var DEFAULT_FONT =
    "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI'," +
    "'Helvetica Neue',Arial,system-ui,sans-serif";

  // A loose flourish placeholder — replaced by Wesley's real signatures
  // (drawn in /debug/signature-capture) via WK_SIGNATURE.signatures.
  var PLACEHOLDER_SIGNATURES = [
    {
      viewBox: "0 0 200 78",
      paths: [
        "M8 52 C 18 8, 30 8, 38 50 C 46 16, 58 16, 66 50 C 82 10, 104 66, 132 40 C 150 26, 168 30, 194 42",
        "M14 64 C 60 75, 140 75, 190 58",
      ],
      weight: 4,
    },
  ];

  var domains = option("domains", "wesleykamau.com");
  if (typeof domains === "string") domains = domains.split(",");
  domains = domains
    .map(function (d) {
      return String(d).trim().toLowerCase();
    })
    .filter(Boolean);

  var cfg = {
    name: String(option("name", "Wesley Kamau")),
    paper: safeColor(option("paper", "#093b3f"), "#093b3f"),
    ink: safeColor(option("ink", "#f4f1e8"), "#f4f1e8"),
    font: typeof option("font", "") === "string" && option("font", "")
      ? option("font", "")
      : DEFAULT_FONT,
    // Reveal transition style, applied consistently to every load and hop:
    // "up" | "slide" | "fade" | "zoom" | "rise".
    reveal: normalizeReveal(option("reveal", "up")),
    // Minimum time the signature holds before revealing, even if the page is
    // already loaded — keeps every load feeling uniform, never a flash.
    minHold: Math.max(0, parseInt(option("minHold", 1500), 10) || 1500),
    domains: domains,
    signatures:
      Array.isArray(user.signatures) && user.signatures.length
        ? user.signatures
        : PLACEHOLDER_SIGNATURES,
    // Per-project variants: [{ path|host, name, paper, ink, font, design }].
    variants: Array.isArray(user.variants) ? user.variants : [],
    // Wordmark name -> { family, weight } of an inlined subsetted font. The
    // site injects the matching @font-face; using these guarantees the
    // wordmark paints in the right face with no swap. Falls back to `font`.
    fonts: user.fonts && typeof user.fonts === "object" ? user.fonts : null,
  };

  /**
   * Resolves the variant for a URL. Path rules only apply on our own host;
   * host rules let an exit close in the destination site's branding.
   */
  function variantEntryFor(url) {
    var best = null;
    var bestLen = -1;
    for (var i = 0; i < cfg.variants.length; i++) {
      var v = cfg.variants[i];
      if (v.host) {
        var h = String(v.host).toLowerCase();
        var hn = url.hostname.toLowerCase();
        if (hn === h || hn.slice(-(h.length + 1)) === "." + h) {
          if (h.length + 1000 > bestLen) {
            best = v;
            bestLen = h.length + 1000; // host match beats path match
          }
        }
      } else if (v.path && url.host === location.host) {
        var p = String(v.path);
        if (
          url.pathname === p ||
          url.pathname.slice(0, p.length + 1) === p + "/"
        ) {
          if (p.length > bestLen) {
            best = v;
            bestLen = p.length;
          }
        }
      }
    }
    return best;
  }

  /** Merges a variant/look object over the base config. */
  function resolveLook(entry) {
    entry = entry || {};
    // Back-compat: accept old {line1,line2} shape as a joined name.
    var name =
      entry.name !== undefined
        ? entry.name
        : entry.line1 !== undefined
        ? String(entry.line1) + (entry.line2 ? " " + entry.line2 : "")
        : cfg.name;
    name = String(name);

    var stack =
      typeof entry.font === "string" && entry.font ? entry.font : cfg.font;
    // An inlined subsetted face for this exact wordmark (guaranteed present,
    // no swap). Prepend it to the stack and use it for the fonts.load gate.
    var inlined = cfg.fonts && cfg.fonts[name];
    var family = inlined ? inlined.family : firstFamily(stack);
    var font = inlined ? "'" + inlined.family + "'," + stack : stack;

    return {
      name: name,
      paper: safeColor(entry.paper !== undefined ? entry.paper : cfg.paper, cfg.paper),
      ink: safeColor(entry.ink !== undefined ? entry.ink : cfg.ink, cfg.ink),
      font: font,
      family: family,
      weight: inlined ? inlined.weight : 0, // 0 → CSS default weight
      reveal: entry.reveal ? normalizeReveal(entry.reveal) : cfg.reveal,
    };
  }

  /** First real family name from a CSS font-family stack (for fonts.load). */
  function firstFamily(stack) {
    var first = String(stack).split(",")[0].trim();
    return first.replace(/^['"]|['"]$/g, "");
  }

  // One signature is chosen per browsing *session*, not per page — so the mark
  // stays identical across every hop of a journey (no jarring mid-transition
  // switch). A fresh browser session (or explicit reset) rolls a new one.
  var SIG_KEY = "__wk_sig";
  function pickSignature() {
    var list = cfg.signatures;
    if (!list || !list.length) return PLACEHOLDER_SIGNATURES[0];
    var idx = -1;
    try {
      var stored = sessionStorage.getItem(SIG_KEY);
      if (stored !== null && stored !== "") {
        var n = parseInt(stored, 10);
        if (n >= 0) idx = n % list.length;
      }
    } catch (e) {
      /* storage blocked */
    }
    if (idx < 0) {
      // First view of the session: roll one (Riley-Walz-style random doodle),
      // falling back to the first if Math.random is stubbed (some sandboxes).
      try {
        idx = Math.floor(Math.random() * list.length);
      } catch (e) {
        idx = 0;
      }
      try {
        sessionStorage.setItem(SIG_KEY, String(idx));
      } catch (e) {
        /* storage blocked — a per-page roll is the graceful degradation */
      }
    }
    return list[idx % list.length] || list[0];
  }

  var currentEntry = null;
  try {
    currentEntry = variantEntryFor(new URL(location.href));
  } catch (e) {
    /* keep base */
  }

  var reduced = false;
  try {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    /* matchMedia unavailable — treat as full motion */
  }

  // Timings (ms).
  var T = {
    reveal: 580, // sheet lifting / sliding away
    close: 320, // sheet sliding in before navigation
    fade: 180, // reduced-motion fade
    capHold: 5000, // hard cap: reveal even if "ready"/assets never resolve
    reopenSafety: 5000, // reopen if a started navigation never lands
  };
  // Minimum hold before revealing. Uniform for first/repeat so every load
  // feels the same even when the page is already cached; handoff (arriving
  // from a sister domain) still draws the signature but a touch quicker.
  // Arrival modes already spent time on the departing page's covering sheet, so
  // they hold briefly (never a flash) rather than the full cold-load minimum.
  function isArrival(mode) {
    return mode === "handoff" || mode === "continue";
  }
  function holdFor(mode) {
    return isArrival(mode) ? Math.min(cfg.minHold, 650) : cfg.minHold;
  }

  function isOwned(hostname) {
    hostname = String(hostname).toLowerCase();
    return cfg.domains.some(function (d) {
      return hostname === d || hostname.slice(-(d.length + 1)) === "." + d;
    });
  }

  // A cross-domain hop carries the chosen signature index in the URL fragment
  // (#wk<idx>) so the destination continues the *same* mark. Seed it before the
  // first pick, then scrub it from the address bar.
  try {
    var hm = /(?:^|[#&?])wk(\d+)/.exec(location.hash || "");
    if (hm) {
      sessionStorage.setItem(SIG_KEY, String(parseInt(hm[1], 10)));
      var clean = (location.hash || "").replace(/(?:^|[#&?])wk\d+/, "");
      if (clean === "#" || clean === "") clean = "";
      if (history.replaceState)
        history.replaceState(null, "", location.pathname + location.search + clean);
    }
  } catch (e) {
    /* fragment handoff is best-effort */
  }

  // Entry mode.
  var seen = false;
  try {
    seen = sessionStorage.getItem("__wk_signature") === "1";
    sessionStorage.setItem("__wk_signature", "1");
  } catch (e) {
    /* storage blocked — treat every load as a first visit */
  }
  // A same-origin close() sets a short-lived continuation token just before it
  // navigates. Arriving with a fresh token means this load is the back half of
  // a transition the previous page already started — come up already-written
  // (see "continue" mode) instead of replaying the whole intro.
  var continued = false;
  try {
    var ct = sessionStorage.getItem("__wk_cont");
    if (ct) {
      sessionStorage.removeItem("__wk_cont");
      continued = Date.now() - parseInt(ct, 10) < 4000;
    }
  } catch (e) {
    /* storage blocked */
  }
  var handoff = false;
  try {
    if (doc.referrer) {
      var ref = new URL(doc.referrer);
      handoff = ref.host !== location.host && isOwned(ref.hostname);
    }
  } catch (e) {
    /* unparsable referrer */
  }
  // "continue" (same-origin hop) and "handoff" (cross-domain hop) are both
  // *arrival* modes: the transition is already in flight, so the sheet arrives
  // static and just reveals. "first"/"repeat" are cold loads that play in full.
  var entryMode = continued
    ? "continue"
    : handoff
    ? "handoff"
    : seen
    ? "repeat"
    : "first";

  // ---------------------------------------------------------------- styles
  var css =
    "#wk-signature{position:fixed;inset:0;z-index:2147483001;pointer-events:none;" +
    "--wks-paper:" + cfg.paper + ";--wks-ink:" + cfg.ink + ";--wks-sign:var(--wks-ink);" +
    "--wks-reveal:" + T.reveal + "ms;--wks-close:" + T.close + "ms;--wks-fade:" + T.fade + "ms;" +
    "font-family:var(--wks-font," + DEFAULT_FONT + ");" +
    "-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}" +
    // The sheet holds two background halves (so 'split' can part them) plus a
    // centered content stage. 'up' moves the whole sheet; 'iris' clips it.
    "#wk-signature .wks-sheet{position:absolute;inset:0;overflow:hidden;" +
    "clip-path:inset(0);will-change:transform,clip-path;" +
    "transition:transform var(--wks-reveal) cubic-bezier(.7,0,.2,1),clip-path var(--wks-reveal) cubic-bezier(.7,0,.2,1)}" +
    "#wk-signature .wks-bg{position:absolute;left:0;width:100%;height:50.2%;background:var(--wks-paper);" +
    "will-change:transform}" +
    "#wk-signature .wks-bg-top{top:0}#wk-signature .wks-bg-bottom{bottom:0}" +
    "#wk-signature .wks-bg{transition:transform var(--wks-reveal) cubic-bezier(.7,0,.2,1)}" +
    // Oversized centered wordmark; signature a subtle credit lower-right.
    "#wk-signature .wks-stage{position:absolute;inset:0;display:flex;align-items:center;" +
    "justify-content:center;padding:4vmin;box-sizing:border-box;will-change:transform,opacity;" +
    "transition:transform var(--wks-reveal) ease,opacity calc(var(--wks-reveal) * .55) ease}" +
    "#wk-signature .wks-mark{color:var(--wks-ink);font-family:var(--wks-font," + DEFAULT_FONT + ");" +
    "font-weight:var(--wks-weight,700);line-height:.92;letter-spacing:-.045em;text-align:center;" +
    "white-space:nowrap;margin:0;font-size:clamp(40px,9vw,112px)}" +
    "#wk-signature .wks-ch{display:inline-block;will-change:transform,opacity}" +
    "#wk-signature .wks-sign{position:absolute;right:11%;bottom:14%;width:min(168px,36vw);opacity:.78;height:auto}" +
    "#wk-signature .wks-sign path{fill:none;stroke:var(--wks-sign);" +
    "stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}" +
    // Letter rise-in, gated on the wordmark's font being ready so it appears
    // already in the right face — never a mid-animation swap. A soft ease-out
    // with a brief blur-off makes the word settle in like ink rather than
    // snapping on; the travel is small so it reads as arriving, not sliding.
    "@keyframes wks-rise{0%{opacity:0;transform:translateY(.3em);filter:blur(6px)}" +
    "55%{filter:blur(0)}100%{opacity:1;transform:none;filter:blur(0)}}" +
    "#wk-signature .wks-ch{opacity:0}" +
    "#wk-signature[data-type-ready] .wks-ch{animation:wks-rise .74s cubic-bezier(.19,.66,.16,1) both}" +
    // Arrival (handoff/continue) and any pre-settled sheet: wordmark already in
    // place — no second fade-in as it slides back out.
    "#wk-signature[data-entry=handoff] .wks-ch,#wk-signature[data-entry=continue] .wks-ch," +
    "#wk-signature[data-static] .wks-ch{animation:none!important;opacity:1;transform:none;filter:none}" +
    // Waiting-for-load: the completed signature breathes so a slow page still
    // feels alive (not frozen).
    "@keyframes wks-breathe{0%,100%{opacity:.62}50%{opacity:1}}" +
    "#wk-signature[data-waiting] .wks-sign{animation:wks-breathe 1.15s ease-in-out infinite}" +

    // ---- reveal: up — the whole sheet lifts away ----
    "#wk-signature[data-reveal=up][data-state=out] .wks-sheet{transform:translateY(-101%)}" +
    "#wk-signature[data-reveal=up][data-mode=close] .wks-sheet{transform:translateY(-101%);" +
    "transition:transform var(--wks-close) cubic-bezier(.4,0,.2,1)}" +
    "#wk-signature[data-reveal=up][data-mode=close][data-state=in] .wks-sheet{transform:none}" +

    // ---- reveal: split — barn-door, halves part vertically, type lifts out ----
    "#wk-signature[data-reveal=split][data-state=out] .wks-bg-top{transform:translateY(-101%)}" +
    "#wk-signature[data-reveal=split][data-state=out] .wks-bg-bottom{transform:translateY(101%)}" +
    "#wk-signature[data-reveal=split][data-state=out] .wks-stage{opacity:0;transform:translateY(-8%) scale(.97)}" +
    "#wk-signature[data-reveal=split][data-mode=close] .wks-bg{transition:transform var(--wks-close) cubic-bezier(.4,0,.2,1)}" +
    "#wk-signature[data-reveal=split][data-mode=close] .wks-bg-top{transform:translateY(-101%)}" +
    "#wk-signature[data-reveal=split][data-mode=close] .wks-bg-bottom{transform:translateY(101%)}" +
    "#wk-signature[data-reveal=split][data-mode=close] .wks-stage{opacity:0}" +
    "#wk-signature[data-reveal=split][data-mode=close][data-state=in] .wks-bg-top," +
    "#wk-signature[data-reveal=split][data-mode=close][data-state=in] .wks-bg-bottom{transform:none}" +
    "#wk-signature[data-reveal=split][data-mode=close][data-state=in] .wks-stage{opacity:1}" +

    // ---- reveal: iris — the sheet implodes to the center point ----
    "#wk-signature[data-reveal=iris][data-state=out] .wks-sheet{clip-path:inset(50% 50% 50% 50% round 50%)}" +
    "#wk-signature[data-reveal=iris][data-state=out] .wks-stage{opacity:0;transform:scale(.9)}" +
    "#wk-signature[data-reveal=iris][data-mode=close] .wks-sheet{clip-path:inset(50% 50% 50% 50% round 50%);" +
    "transition:clip-path var(--wks-close) cubic-bezier(.4,0,.2,1)}" +
    "#wk-signature[data-reveal=iris][data-mode=close] .wks-stage{opacity:0}" +
    "#wk-signature[data-reveal=iris][data-mode=close][data-state=in] .wks-sheet{clip-path:inset(0)}" +
    "#wk-signature[data-reveal=iris][data-mode=close][data-state=in] .wks-stage{opacity:1}" +

    // Reduced motion: pure opacity fade, no movement/clip, wordmark at rest.
    "#wk-signature[data-motion=reduce] .wks-sheet{transition:opacity var(--wks-fade) linear;clip-path:none!important}" +
    "#wk-signature[data-motion=reduce] .wks-bg,#wk-signature[data-motion=reduce] .wks-stage{transform:none!important;transition:none}" +
    "#wk-signature[data-motion=reduce] .wks-ch{animation:none!important;opacity:1;transform:none;filter:none}" +
    "#wk-signature[data-motion=reduce][data-state=out] .wks-sheet{opacity:0}" +
    "#wk-signature[data-motion=reduce][data-mode=close] .wks-sheet{opacity:0}" +
    "#wk-signature[data-motion=reduce][data-mode=close][data-state=in] .wks-sheet{opacity:1}" +
    "@media print{#wk-signature{display:none}}";

  var style = doc.createElement("style");
  style.id = "wk-signature-style";
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);

  var SVGNS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------------ DOM
  function build(entry) {
    var look = resolveLook(entry === undefined ? currentEntry : entry);
    var sig = pickSignature();

    var el = doc.createElement("div");
    el.id = "wk-signature";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-reveal", look.reveal);
    el.style.setProperty("--wks-paper", look.paper);
    el.style.setProperty("--wks-ink", look.ink);
    el.style.setProperty("--wks-font", look.font);
    if (look.weight) el.style.setProperty("--wks-weight", String(look.weight));
    // Stash for the font-ready gate + width fit, and the picked signature for
    // the (optionally time-accurate) draw-on.
    el._wksFamily = look.family;
    el._wksWeight = look.weight || 700;
    el._wksName = look.name;
    el._wksSig = sig;
    if (reduced) el.setAttribute("data-motion", "reduce");

    var sheet = doc.createElement("div");
    sheet.className = "wks-sheet";
    // Two background halves so the 'split' reveal can part them vertically.
    var bgTop = doc.createElement("div");
    bgTop.className = "wks-bg wks-bg-top";
    var bgBot = doc.createElement("div");
    bgBot.className = "wks-bg wks-bg-bottom";
    var stage = doc.createElement("div");
    stage.className = "wks-stage";

    // Wordmark, split into per-letter spans (the letters rise in).
    var mark = doc.createElement("div");
    mark.className = "wks-mark";
    var chars = look.name.split("");
    // Gentle left-to-right stagger, but compressed for long wordmarks so the
    // whole word always finishes settling in a similar, unhurried window.
    var step = chars.length > 9 ? 150 / chars.length : 34;
    for (var i = 0; i < chars.length; i++) {
      var ch = doc.createElement("span");
      ch.className = "wks-ch";
      ch.style.animationDelay = 30 + i * step + "ms";
      ch.textContent = chars[i] === " " ? " " : chars[i];
      mark.appendChild(ch);
    }

    // Signature SVG (rendered complete; animateSignature makes it draw).
    var svg = doc.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "wks-sign");
    svg.setAttribute("viewBox", sig.viewBox || "0 0 200 78");
    svg.setAttribute("fill", "none");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var vb = (sig.viewBox || "0 0 200 78").split(/\s+/);
    var ratio = (parseFloat(vb[3]) || 78) / (parseFloat(vb[2]) || 200);
    svg.style.height = "auto";
    // Reserve height so the stage doesn't reflow when the SVG lays out.
    svg.style.aspectRatio = (parseFloat(vb[2]) || 200) + "/" + (parseFloat(vb[3]) || 78);
    var paths = sig.paths || [];
    for (var j = 0; j < paths.length; j++) {
      var path = doc.createElementNS(SVGNS, "path");
      path.setAttribute("d", paths[j]);
      path.setAttribute("stroke-width", String(sig.weight || 4));
      svg.appendChild(path);
    }
    void ratio;

    stage.appendChild(mark);
    stage.appendChild(svg);
    sheet.appendChild(bgTop);
    sheet.appendChild(bgBot);
    sheet.appendChild(stage);
    el.appendChild(sheet);
    return el;
  }

  function destroyAll() {
    var el;
    while ((el = doc.getElementById("wk-signature"))) {
      el.parentNode.removeChild(el);
    }
  }

  /**
   * Blank a sheet's signature (hide the strokes) — used on the departing cover
   * of a navigation, since the destination writes the mark fresh on arrival.
   * Without this the cover would flash the completed mark and then the new page
   * would start it from empty.
   */
  function hideSignatureMark(el) {
    var paths = el.querySelectorAll(".wks-sign path");
    for (var i = 0; i < paths.length; i++) {
      var L = 100;
      try {
        L = paths[i].getTotalLength() || 100;
      } catch (e) {
        /* no geometry — leave as-is */
      }
      paths[i].style.strokeDasharray = L + " " + (L + 2);
      paths[i].style.strokeDashoffset = String(L);
    }
  }

  /**
   * Fit the wordmark to a target width so every project — short name or
   * long — reads at a balanced, centered size (no overflow, no tiny marks).
   * Measured after the font is ready so the width is correct.
   */
  function fitMark(el) {
    var mark = el.querySelector(".wks-mark");
    if (!mark) return;
    var vw = window.innerWidth || 1280;
    var targetW = Math.min(vw * 0.9, 1180);
    var maxPx = Math.min(200, vw * 0.2);
    var minPx = 44;
    mark.style.fontSize = "100px";
    var natural = mark.scrollWidth || 1;
    var size = (100 * targetW) / natural;
    size = Math.max(minPx, Math.min(maxPx, size));
    mark.style.fontSize = size + "px";
  }

  /**
   * Resolve once the wordmark's font is actually available, so the mark is
   * only shown in the correct face — never a fallback that swaps. With the
   * inlined subsetted fonts this is ~instant; the timeout is a safety net
   * for system-stack fonts.
   */
  function whenFontReady(el, cb) {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      cb();
    }
    try {
      if (doc.fonts && doc.fonts.load && el._wksFamily) {
        doc.fonts
          .load(el._wksWeight + " 48px '" + el._wksFamily + "'", el._wksName)
          .then(go, go);
      }
    } catch (e) {
      /* fall through to the timeout */
    }
    setTimeout(go, 450);
  }

  /**
   * Drives the signature "drawing itself" — the curtain's loading indicator.
   * Returns the total draw duration (ms) so the reveal can hold until it's done.
   *
   * If the signature carries captured `timing` (per stroke: { start, dur, pace })
   * the strokes play back at Wesley's real writing pace — the pen speeds up,
   * slows through curves, and pauses between strokes exactly as he wrote it,
   * via Web Animations keyframes that map draw-progress to recorded time. If
   * there's no timing (older captures), it falls back to a length-proportional
   * sequential draw over fallbackMs.
   */
  function animateSignature(el, fallbackMs) {
    var paths = el.querySelectorAll(".wks-sign path");
    if (!paths.length) return 0;
    var sig = el._wksSig || {};
    var timing = sig.timing;

    var lens = [];
    var total = 0;
    for (var i = 0; i < paths.length; i++) {
      var L = 0;
      try {
        L = paths[i].getTotalLength() || 0;
      } catch (e) {
        L = 0;
      }
      L = L || 100;
      lens.push(L);
      total += L;
      // A hair of slack on the visible dash so the very tip of the stroke
      // renders (round caps) rather than clipping at exactly 0. Start fully
      // hidden (offset = length).
      paths[i].style.strokeDasharray = L + " " + (L + 2);
      paths[i].style.strokeDashoffset = String(L);
    }

    var canWAAPI =
      timing &&
      timing.length === paths.length &&
      typeof paths[0].animate === "function";

    // Build the per-stroke plan + total duration synchronously (the reveal
    // holds on the returned duration), but DON'T start the motion yet.
    var plan = [];
    var totalMs = 0;
    if (canWAAPI) {
      for (var k = 0; k < paths.length; k++) {
        var t = timing[k] || {};
        var startK = Math.max(0, +t.start || 0);
        var durK = Math.max(60, +t.dur || 300);
        totalMs = Math.max(totalMs, startK + durK);
        var Lk = lens[k];
        var pace = t.pace;
        var frames;
        if (pace && pace.length >= 2) {
          // pace[m] = fraction of `dur` elapsed by the time the pen has drawn
          // m/(n-1) of the stroke's length. Each becomes a keyframe placing the
          // dash at that length — so intra-stroke speed + dwells are preserved.
          frames = [];
          var n = pace.length;
          var prev = 0;
          for (var m = 0; m < n; m++) {
            var off = +pace[m];
            if (!(off >= 0)) off = prev;
            if (off < prev) off = prev; // keep offsets monotonic (WAAPI needs it)
            if (off > 1) off = 1;
            prev = off;
            var lf = m / (n - 1);
            frames.push({
              offset: off,
              strokeDashoffset: (Lk * (1 - lf)).toFixed(2),
            });
          }
          frames[0].offset = 0;
          frames[frames.length - 1].offset = 1;
        } else {
          frames = [
            { offset: 0, strokeDashoffset: String(Lk) },
            { offset: 1, strokeDashoffset: "0" },
          ];
        }
        plan.push({ waapi: true, frames: frames, dur: durK, delay: startK });
      }
    } else {
      // Fallback (no captured timing): synthesize a believable *writing* pace so
      // it reads as a hand, not a blob that snaps on. Strokes draw strictly in
      // order — one finishes and the pen lifts before the next begins — each
      // taking time in proportion to its length (long strokes take longer), with
      // a floor so short strokes don't flash. Scaled into a deliberate window
      // and eased at each stroke's end so the pen settles into its lift rather
      // than stopping dead. `fallbackMs` only sets a soft cap.
      var PEN_LIFT = 120; // pause between strokes (pen off the paper)
      var PER_UNIT = 2.2; // ms of draw per viewBox length unit
      var MIN_STROKE = 200; // shortest a single stroke may take
      var MAX_DRAW = Math.max(2200, fallbackMs); // cap the whole signature
      var durs = [];
      var penTime = 0;
      for (var d = 0; d < paths.length; d++) {
        durs[d] = Math.max(MIN_STROKE, lens[d] * PER_UNIT);
        penTime += durs[d];
      }
      var wall = penTime + PEN_LIFT * Math.max(0, paths.length - 1);
      var scale = wall > MAX_DRAW ? MAX_DRAW / wall : 1;
      var acc = 0;
      for (var j = 0; j < paths.length; j++) {
        var dj = durs[j] * scale;
        // Ease into the very first down-stroke; let every stroke decelerate into
        // its pen-lift. Near-constant speed through the body of each stroke.
        var ease =
          j === 0 ? "cubic-bezier(.42,0,.32,1)" : "cubic-bezier(.25,.02,.32,1)";
        plan.push({ waapi: false, dur: dj, delay: acc, ease: ease });
        totalMs = acc + dj;
        acc += dj + PEN_LIFT * scale; // pen lift before the next stroke
      }
    }

    // Kick the motion off on a later frame. The curtain is built in <head>
    // before the first paint; a transition (or animation) started in that same
    // task never runs — the browser just renders the end state, and the mark
    // "snaps on" complete. Waiting two frames lets the hidden initial state
    // paint first, so the draw actually animates from empty.
    function begin() {
      for (var p = 0; p < paths.length; p++) {
        var pl = plan[p];
        if (pl.waapi) {
          try {
            paths[p].animate(pl.frames, {
              duration: pl.dur,
              delay: pl.delay,
              easing: "linear",
              fill: "both",
            });
          } catch (e) {
            paths[p].style.strokeDashoffset = "0"; // never leave it hidden
          }
        } else {
          paths[p].style.transition =
            "stroke-dashoffset " + pl.dur + "ms " + pl.ease + " " + pl.delay + "ms";
          paths[p].style.strokeDashoffset = "0";
        }
      }
    }
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        requestAnimationFrame(begin);
      });
    } else {
      begin();
    }

    return totalMs;
  }

  // ---------------------------------------------------------------- intro
  var overlay = null;
  var revealed = false;
  var revealedOnce = false; // has an intro ever revealed this page view?
  var holds = 0; // outstanding page-registered holds (hold/release API)
  var currentMaybe = null; // the active intro's reveal-gate re-check

  /**
   * Let the page defer the reveal until its own critical content is ready
   * (e.g. the hero image decoding, a game's first frame). Returns a release
   * function. The reveal still can't exceed the hard cap, so a forgotten
   * release can never trap the visitor.
   */
  function hold() {
    holds++;
    var released = false;
    return function release() {
      if (released) return;
      released = true;
      holds = Math.max(0, holds - 1);
      if (currentMaybe) currentMaybe();
    };
  }

  /**
   * Wait for every <img data-wk-wait> currently in the page to finish (or
   * fail) loading, then call cb. These are the critical above-the-fold images
   * a page marks so the curtain doesn't reveal onto a blank slot.
   */
  function waitForMarkedImages(cb) {
    var imgs;
    try {
      imgs = doc.querySelectorAll("img[data-wk-wait]");
    } catch (e) {
      cb();
      return;
    }
    var pending = 0;
    var settled = false;
    function oneDone() {
      pending--;
      if (pending <= 0 && !settled) {
        settled = true;
        cb();
      }
    }
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.complete && im.naturalWidth > 0) continue;
      pending++;
      im.addEventListener("load", oneDone, { once: true });
      im.addEventListener("error", oneDone, { once: true });
    }
    if (pending === 0) cb();
  }
  var revealWaiters = []; // callbacks queued via whenRevealed()

  // Fired the instant the curtain begins revealing — the moment the page
  // becomes visible. Consumers gate entrance animations on this so they don't
  // play behind the sheet (e.g. the mobile hero's incoming-message cascade).
  function signalReveal(mode, name) {
    revealedOnce = true;
    try {
      doc.dispatchEvent(
        new CustomEvent("wk-signature:reveal", {
          detail: { mode: mode || null, name: name || null },
        })
      );
    } catch (e) {
      /* CustomEvent unsupported — the API callbacks below still fire */
    }
    var waiters = revealWaiters;
    revealWaiters = [];
    for (var i = 0; i < waiters.length; i++) {
      try {
        waiters[i]();
      } catch (e) {
        /* a bad consumer callback must not block the others */
      }
    }
  }

  function reveal() {
    if (revealed || !overlay) return;
    revealed = true;
    var mode = overlay.getAttribute("data-entry");
    var name = overlay._wksName;
    overlay.removeAttribute("data-waiting");
    overlay.setAttribute("data-state", "out");
    var linger = (reduced ? T.fade : T.reveal) + 60;
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      // Signal only once the reveal animation has fully finished — the page
      // is now unobstructed — so gated entrance animations start clean, with
      // the reveal duration as a built-in buffer.
      signalReveal(mode, name);
    }, linger);
  }

  function startIntro(mode, entry) {
    destroyAll();
    revealed = false;
    overlay = build(entry);
    overlay.setAttribute("data-entry", mode);
    // Appending to <html> works before <body> exists — this script runs
    // synchronously in <head>, pre-first-paint.
    doc.documentElement.appendChild(overlay);

    var holdMs = holdFor(mode);
    var held = false;
    var domDone = doc.readyState !== "loading";
    var assetsReady = false;
    var capped = false;

    // Reveal only once the minimum hold has elapsed AND the DOM is ready AND
    // critical images have loaded AND no page hold is outstanding — so a
    // fast/cached page still holds the full minHold (uniform) and a slow one
    // waits (breathing) rather than flashing empty. `capped` overrides all so
    // it can never trap the visitor.
    function maybe() {
      if (capped || (held && domDone && assetsReady && holds === 0)) reveal();
    }
    currentMaybe = maybe;

    // Once the DOM exists, wait for any <img data-wk-wait> to finish loading.
    function armAssets() {
      waitForMarkedImages(function () {
        assetsReady = true;
        maybe();
      });
    }

    // Reveal the wordmark only once its font is ready (fit width first), so
    // it appears already in the correct face — the fix for the font swap.
    whenFontReady(overlay, function () {
      if (!overlay) return;
      fitMark(overlay);
      overlay.setAttribute("data-type-ready", "");
    });

    // The signature writes itself on EVERY entry — cold loads and arrival hops
    // alike — at Wesley's real captured pace when timing is present. The reveal
    // is never instantaneous: it holds at least until the mark finishes writing
    // (+ a beat to admire it), so the slide never starts before the signature
    // is drawn, and a fast page never reveals mid-stroke. On arrivals only the
    // *wordmark* stays put (static, see CSS) to avoid a second text-in — the
    // same carried mark still (re)writes, which is what keeps it from feeling
    // like a blank flash-and-slide.
    var drawMs = 0;
    if (!reduced) drawMs = animateSignature(overlay, holdMs);
    var effHold = drawMs ? Math.max(holdMs, drawMs + 220) : holdMs;

    setTimeout(function () {
      held = true;
      // Held long enough but page still parsing/loading: breathe while we wait.
      if (!domDone || !assetsReady || holds > 0)
        overlay.setAttribute("data-waiting", "");
      maybe();
    }, effHold + (reduced ? 0 : 60));

    // Hard cap so a slow (or never-"ready") page can't trap the visitor — but
    // never shorter than the signature's own draw, so a long careful mark isn't
    // guillotined mid-stroke.
    setTimeout(function () {
      capped = true;
      maybe();
    }, Math.max(T.capHold, effHold + 400));

    if (!domDone) {
      doc.addEventListener(
        "DOMContentLoaded",
        function () {
          domDone = true;
          armAssets();
          maybe();
        },
        { once: true }
      );
    } else {
      armAssets();
    }
    maybe();
  }

  // ----------------------------------------------------------------- exit
  var closing = false;
  var closeEl = null; // the covering sheet from a URL-less (SPA) close

  function close(url, entry) {
    if (closing) return;
    closing = true;
    destroyAll();
    overlay = null;
    closeEl = null;

    // Close in the destination's branding when we know it.
    var chosen = entry;
    if (chosen === undefined && url) {
      try {
        chosen = variantEntryFor(new URL(url, location.href)) || currentEntry;
      } catch (e) {
        chosen = currentEntry;
      }
    }

    var el = build(chosen);
    el.setAttribute("data-mode", "close");
    doc.documentElement.appendChild(el);
    // Navigating away: the destination writes the mark fresh, so keep this
    // cover's signature blank (no completed-then-empty flash across the load).
    if (url) hideSignatureMark(el);

    // Render the destination wordmark in its own (inlined) font, fitted.
    whenFontReady(el, function () {
      fitMark(el);
      el.setAttribute("data-type-ready", "");
    });

    // Double rAF: commit the off-position, then slide the sheet in.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.setAttribute("data-state", "in");
      });
    });

    // Hand the journey to the destination so it continues as one move rather
    // than replaying the whole intro: same-origin gets a short-lived token in
    // sessionStorage ("continue" mode); a cross-domain owned hop can't share
    // storage, so the chosen signature index rides along in the URL fragment
    // (#wk<idx>) and the referrer already flags it as a "handoff".
    var navUrl = url;
    if (url) {
      try {
        var dest = new URL(url, location.href);
        if (dest.origin === location.origin) {
          sessionStorage.setItem("__wk_cont", String(Date.now()));
        } else if (isOwned(dest.hostname) && !dest.hash) {
          var sigIdx = sessionStorage.getItem(SIG_KEY);
          if (sigIdx !== null && sigIdx !== "") {
            dest.hash = "wk" + parseInt(sigIdx, 10);
            navUrl = dest.href;
          }
        }
      } catch (e) {
        /* best-effort continuity — fall back to a plain navigation */
      }
    }

    var settled = (reduced ? T.fade : T.close) + 50;
    if (url) {
      setTimeout(function () {
        api._navigate(navUrl);
      }, settled);
      // If navigation never lands, reopen so nobody is trapped.
      setTimeout(function () {
        if (!doc.hidden && el.parentNode) {
          closing = false;
          releaseSheet(el);
        }
      }, settled + T.reopenSafety);
    } else {
      // SPA flow: keep this exact sheet covering; the app calls settle() once
      // navigation lands to slide THIS sheet back out — no rebuild, so the
      // wordmark never fades in a second time. Safety release if that never
      // comes.
      closing = false;
      closeEl = el;
      setTimeout(function () {
        if (el === closeEl && el.parentNode) settle();
      }, settled + T.reopenSafety);
    }
  }

  /**
   * Reveal the covering SPA close sheet in place (slide it out), reusing the
   * same element so the wordmark is not re-animated. No-op if there isn't one.
   */
  function settle() {
    var el = closeEl;
    closeEl = null;
    if (!el || !el.parentNode) return;
    el.setAttribute("data-static", ""); // freeze the wordmark, don't re-fade
    releaseSheet(el);
  }

  // Slide a closed sheet back off and remove it.
  function releaseSheet(el) {
    el.removeAttribute("data-mode");
    el.setAttribute("data-state", "out");
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, T.reveal + 60);
  }

  // Exit transition for links leaving to another owned domain.
  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.hasAttribute("data-no-signature")) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (err) {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    var forced = a.hasAttribute("data-signature");
    var external = url.host !== location.host;
    if (!forced && !(external && isOwned(url.hostname))) return;
    e.preventDefault();
    close(url.href);
  }
  doc.addEventListener("click", onClick);

  // Back/forward cache: clear every trace of the sheet instantly.
  function onPageShow(e) {
    if (e.persisted) {
      closing = false;
      revealed = true;
      overlay = null;
      closeEl = null;
      destroyAll();
    }
  }
  window.addEventListener("pageshow", onPageShow);

  var api = {
    version: "3.4.0",
    config: cfg,
    /** Animation timings (ms) for orchestrating SPA transitions. */
    timings: { close: T.close, reveal: T.reveal, fade: T.fade },
    /**
     * Reveal the covering SPA close sheet in place (used by the app after an
     * in-app navigation lands). Reuses the sheet from close(null, …) so the
     * wordmark doesn't fade in a second time. Falls back to a handoff replay
     * if there's no sheet to settle.
     */
    settle: function (look) {
      if (closeEl) settle();
      else startIntro("handoff", look);
    },
    /** The variant entry matching a URL (stable reference), or null. */
    variantFor: function (url) {
      try {
        return variantEntryFor(new URL(url, location.href));
      } catch (e) {
        return null;
      }
    },
    /** The variant entry active for the current page, or null. */
    current: function () {
      return currentEntry;
    },
    /** True once the intro curtain has fully revealed the page. */
    revealed: function () {
      return revealedOnce;
    },
    /**
     * Defer the reveal until the page's critical content is ready. Returns a
     * release function; the reveal proceeds once all holds are released (and
     * the other gates pass), bounded by the hard cap. Alternatively, mark
     * critical images with `data-wk-wait` and they're awaited automatically.
     */
    hold: hold,
    /**
     * Run cb the moment the intro reveals — or immediately if it already has.
     * Lets the page defer entrance animations until they're actually visible.
     * Also dispatched as a `wk-signature:reveal` event on `document`.
     */
    whenRevealed: function (cb) {
      if (typeof cb !== "function") return;
      if (revealedOnce) cb();
      else revealWaiters.push(cb);
    },
    /**
     * Replay the intro: mode is "first" | "repeat" | "handoff"; optional
     * look overrides the current page's variant (any {name,paper,ink,font,
     * reveal} object works — used by the debug gallery).
     */
    replay: function (mode, look) {
      closing = false;
      startIntro(
        mode === "first" || mode === "handoff" ? mode : "repeat",
        look
      );
    },
    /**
     * Close the sheet; navigates to url if given, else stays closed until
     * replay() (with a safety auto-release). Optional look forces the brand.
     */
    close: close,
    /** Remove any sheet immediately. */
    destroy: function () {
      closing = false;
      revealed = true;
      overlay = null;
      closeEl = null;
      destroyAll();
    },
    /** Overridable for tests. */
    _navigate: function (url) {
      location.assign(url);
    },
    /** Full uninstall: listeners, DOM, and the global handle. */
    _teardown: function () {
      doc.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onPageShow);
      api.destroy();
      if (window.__wkSignature === api) window.__wkSignature = undefined;
    },
  };
  window.__wkSignature = api;

  // Speculative prerender: don't burn the intro before the visitor sees it.
  if (doc.prerendering) {
    doc.addEventListener(
      "prerenderingchange",
      function () {
        startIntro(entryMode);
      },
      { once: true }
    );
  } else {
    startIntro(entryMode);
  }
})();

import { ImageResponse } from "next/og";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Use nodejs runtime to read cached files
export const runtime = "nodejs";
// Regenerate at most hourly: crawlers hit this on every page share, and the
// collage doesn't need to differ per-request — just per hour (seed below).
export const revalidate = 3600;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Deterministic PRNG so the shuffle is stable for a given hour bucket —
// cacheable, testable, and still rotates the collage over time.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function Image() {
  const fontPath = join(process.cwd(), "src/app/fonts/Instagram Sans.ttf");
  const instagramSansFont = await readFile(fontPath);

  const rand = mulberry32(Math.floor(Date.now() / 3_600_000));

  // Read cached images from public/og-cache
  const cacheDir = join(process.cwd(), "public", "og-cache");
  const profilesPerRow = 8;
  const totalNeeded = profilesPerRow * 2; // Only need 16 images

  let imageBuffers: { id: string; dataUrl: string }[] = [];

  if (existsSync(cacheDir)) {
    const files = await readdir(cacheDir);
    const imageFiles = files.filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));

    // Shuffle filenames first, then only read what we need
    const filesToRead = seededShuffle(imageFiles, rand).slice(0, totalNeeded);

    // Only read the images we actually need (16 instead of 178)
    imageBuffers = await Promise.all(
      filesToRead.map(async (filename) => {
        const buffer = await readFile(join(cacheDir, filename));
        const base64 = buffer.toString("base64");
        const mimeType = filename.endsWith(".jpg") ? "image/jpeg" : "image/png";
        return {
          id: filename.replace(/\.(jpg|png)$/, ""),
          dataUrl: `data:${mimeType};base64,${base64}`,
        };
      })
    );
  }

  // Ensure we have enough images by repeating if needed
  while (imageBuffers.length < totalNeeded && imageBuffers.length > 0) {
    imageBuffers.push(...imageBuffers.slice(0, totalNeeded - imageBuffers.length));
  }

  const rows = [
    imageBuffers.slice(0, profilesPerRow),
    imageBuffers.slice(profilesPerRow, profilesPerRow * 2),
  ];

  // Much larger images with random positioning for carousel effect
  const profileSize = 240; // Twice as big
  const profileGap = 16;
  const borderRadius = 12; // rounded-lg equivalent

  // Generate random x offsets for entire rows (0 to profileSize)
  const topRowOffset = Math.floor(rand() * profileSize);
  const bottomRowOffset = Math.floor(rand() * profileSize);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          fontFamily: "Instagram Sans",
          overflow: "hidden",
        }}
      >
        {/* Top row - partially clipped off top */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: `${profileGap}px`,
            transform: `translateY(-60px) translateX(${topRowOffset}px)`,
            marginLeft: "-200px", // Overflow left
            marginRight: "-200px", // Overflow right
          }}
        >
          {rows[0].map((img, idx) => (
            // next/og (Satori) requires raw <img>; next/image is unavailable here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`top-${img.id}-${idx}`}
              alt=""
              src={img.dataUrl}
              width={profileSize}
              height={profileSize}
              style={{
                borderRadius: `${borderRadius}px`,
                objectFit: "cover",
              }}
            />
          ))}
        </div>

        {/* Center text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 100,
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          Wesleygram
        </div>

        {/* Bottom row - partially clipped off bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: `${profileGap}px`,
            transform: `translateY(60px) translateX(${bottomRowOffset}px)`,
            marginLeft: "-200px", // Overflow left
            marginRight: "-200px", // Overflow right
          }}
        >
          {rows[1].map((img, idx) => (
            // next/og (Satori) requires raw <img>; next/image is unavailable here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`bottom-${img.id}-${idx}`}
              alt=""
              src={img.dataUrl}
              width={profileSize}
              height={profileSize}
              style={{
                borderRadius: `${borderRadius}px`,
                objectFit: "cover",
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instagram Sans",
          data: instagramSansFont,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}

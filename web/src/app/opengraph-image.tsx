import { ImageResponse } from "next/og";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Use nodejs runtime to read cached files
export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  // Read font file directly in nodejs runtime
  const fontPath = join(process.cwd(), "src/app/fonts/Instagram-Sans.ttf");
  const instagramSansFont = await readFile(fontPath);

  // Read cached images from public/og-cache
  const cacheDir = join(process.cwd(), "public", "og-cache");
  const profilesPerRow = 8;
  const totalNeeded = profilesPerRow * 2; // Only need 16 images
  
  let imageBuffers: { id: string; dataUrl: string }[] = [];

  if (existsSync(cacheDir)) {
    const files = await readdir(cacheDir);
    const imageFiles = files.filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));
    
    // Shuffle filenames first, then only read what we need
    const shuffledFiles = imageFiles.sort(() => Math.random() - 0.5);
    const filesToRead = shuffledFiles.slice(0, totalNeeded);

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
  const topRowOffset = Math.floor(Math.random() * profileSize);
  const bottomRowOffset = Math.floor(Math.random() * profileSize);

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
            <img
              key={`top-${img.id}-${idx}`}
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
            <img
              key={`bottom-${img.id}-${idx}`}
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

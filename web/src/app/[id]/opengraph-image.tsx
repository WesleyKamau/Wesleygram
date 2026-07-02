import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { getProfileById, getProfileByUsername } from "@/lib/profiles";
import { selectProcessedKey, WESLEY_ID } from "@/lib/images";
import { getPresignedUrl } from "@/lib/r2";

/**
 * Branded share card for each profile. Social crawlers (iMessage, Slack,
 * Twitter, WhatsApp…) don't reliably follow redirects for og:image, so this
 * serves real PNG bytes instead of the old 302-to-R2 hop — and looks a lot
 * better than a bare photo while it's at it.
 */
export const runtime = "nodejs";
export const alt = "Wesleygram profile share card";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfileById(id) ?? getProfileByUsername(id);

  const [billabongFont, instagramSans] = await Promise.all([
    readFile(join(process.cwd(), "src/app/fonts/Billabong.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/Instagram Sans.ttf")),
  ]);

  // Resolve the photo: Wesley uses the local file, everyone else a presigned
  // R2 URL (fetched server-side by the OG renderer while drawing the card).
  let photoSrc: string | null = null;
  if (profile) {
    if (profile.instagram_id === WESLEY_ID) {
      const wesley = await readFile(join(process.cwd(), "public", "wesley_profile.jpg"));
      photoSrc = `data:image/jpeg;base64,${wesley.toString("base64")}`;
    } else {
      const key = selectProcessedKey(profile) || profile.original_image_r2_key;
      if (key) {
        photoSrc = await getPresignedUrl(key);
      }
    }
  }

  const username = profile ? `@${profile.username}` : "Profile not found";
  const fullName = profile?.full_name ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          padding: "60px",
        }}
      >
        {photoSrc && (
          // next/og (Satori) requires raw <img>; next/image is unavailable here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt=""
            width={510}
            height={510}
            style={{
              borderRadius: "24px",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: photoSrc ? "flex-start" : "center",
            flexGrow: 1,
            marginLeft: photoSrc ? "72px" : "0px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: "Billabong",
              fontSize: 110,
              lineHeight: 1,
              marginBottom: 36,
            }}
          >
            Wesleygram
          </div>
          <div
            style={{
              fontFamily: "Instagram Sans",
              fontSize: 52,
              fontWeight: 700,
              maxWidth: 520,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {username}
          </div>
          {fullName && (
            <div
              style={{
                fontFamily: "Instagram Sans",
                fontSize: 34,
                color: "#a8a8a8",
                marginTop: 12,
                maxWidth: 520,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {fullName}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Billabong", data: billabongFont, style: "normal", weight: 400 },
        { name: "Instagram Sans", data: instagramSans, style: "normal", weight: 400 },
      ],
    }
  );
}

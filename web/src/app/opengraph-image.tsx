import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const instagramSansFont = await fetch(
    new URL("./fonts/Instagram-Sans.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          fontFamily: "Instagram Sans",
        }}
      >
        <div
          style={{
            fontSize: "120px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          Wesleygram
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

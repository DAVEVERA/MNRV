import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MNRV \u2014 AI, e-commerce & maatwerk";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(1100px 600px at 30% 30%, #1a1a22, #050507 70%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            opacity: 0.6,
            textTransform: "uppercase",
          }}
        >
          MNRV
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1.02, fontWeight: 500 }}>
            Praat met Clippy.
          </div>
          <div style={{ fontSize: 96, lineHeight: 1.02, fontWeight: 500, opacity: 0.7 }}>
            Bouw met MNRV.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              opacity: 0.6,
              maxWidth: 900,
            }}
          >
            AI-agents, webshops en maatwerk voor de volgende generatie e-commerce.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

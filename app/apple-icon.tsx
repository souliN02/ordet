import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The favicon's O on a green tile, full bleed: iOS rounds the corners itself */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3d9a5b" }}>
        <div style={{ width: 92, height: 92, borderRadius: 999, border: "20px solid #fff" }} />
      </div>
    ),
    size,
  );
}

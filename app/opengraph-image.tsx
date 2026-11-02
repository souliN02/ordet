import { ImageResponse } from "next/og";

export const alt = "Ordet: a daily word game in English and Danish";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TILES: [string, string][] = [
  ["O", "#3a8a52"],
  ["R", "#a8801f"],
  ["D", "#393c42"],
  ["E", "#3a8a52"],
  ["T", "#3a8a52"],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          background: "#121316",
          color: "#f1f2f4",
        }}
      >
        <div style={{ display: "flex", gap: 18 }}>
          {TILES.map(([letter, color]) => (
            <div
              key={letter}
              style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: color, fontSize: 96, color: "#fff" }}
            >
              {letter}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 48 }}>A daily word game in English and Danish</div>
          <div style={{ fontSize: 32, color: "#9da2aa" }}>ordet.bekirsaliv.dk</div>
        </div>
      </div>
    ),
    size,
  );
}

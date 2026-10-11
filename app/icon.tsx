import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The favicon: Builda's orange "A" on deep warm grey.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2A2826", borderRadius: 14 }}>
        <span style={{ fontSize: 48, fontWeight: 900, color: "#F26B1D", lineHeight: 1 }}>A</span>
      </div>
    ),
    size,
  );
}

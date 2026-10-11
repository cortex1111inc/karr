import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#fbfaf6",
          color: "#14140f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="16" fill="#46701f" />
            <path
              fill="#ffffff"
              fillRule="evenodd"
              d="M19 14H33C45.5 14 53 22.2 53 32S45.5 50 33 50H19ZM28 22.5H32.5C38.4 22.5 42.5 26.4 42.5 32S38.4 41.5 32.5 41.5H28Z"
            />
            <circle cx="35" cy="32" r="4.2" fill="#78bb45" />
          </svg>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
            Drive<span style={{ color: "#46701f" }}>stead</span>
          </div>
        </div>
        <div style={{ marginTop: 44, fontSize: 48, lineHeight: 1.2, maxWidth: 900, color: "#625f52" }}>{BRAND.tagline}</div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#46701f" }}>Leads · Quotes · GST invoices · Payments · Fleet · Stock</div>
      </div>
    ),
    size,
  );
}

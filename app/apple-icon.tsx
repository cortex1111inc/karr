import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#46701f" />
        <path
          fill="#ffffff"
          fillRule="evenodd"
          d="M19 14H33C45.5 14 53 22.2 53 32S45.5 50 33 50H19ZM28 22.5H32.5C38.4 22.5 42.5 26.4 42.5 32S38.4 41.5 32.5 41.5H28Z"
        />
        <circle cx="35" cy="32" r="4.2" fill="#78bb45" />
      </svg>
    ),
    size,
  );
}

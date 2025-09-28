import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 6 6" />
        <path d="M12 3a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6" />
        <path d="M12 21a6 6 0 0 1-6-6" />
        <path d="M12 21a6 6 0 0 0 6-6" />
        <path d="M6 9a6 6 0 0 1 6-6" />
        <path d="M18 9a6 6 0 0 0-6-6" />
      </svg>
    ),
    {
      ...size,
    }
  );
}

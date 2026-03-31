import { ReactNode } from 'react';

// Public preview — no app shell, no header
export default function ViewTemplateLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

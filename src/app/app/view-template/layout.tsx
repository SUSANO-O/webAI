import { ReactNode } from 'react';

// View-template is a public preview — no app header/nav
export default function ViewTemplateLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

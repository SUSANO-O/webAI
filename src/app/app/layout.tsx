import { Header } from '@/components/header';
import { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col app-bg">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

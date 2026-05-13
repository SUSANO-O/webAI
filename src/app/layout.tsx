import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import IntroWrapper from '@/components/IntroWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'WEB 360',
  description: 'Generate websites with the power of AI',
  icons: {
    icon: [{ url: '/logo-web360.png', type: 'image/png' }],
    apple: '/logo-web360.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <IntroWrapper>
            {children}
          </IntroWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

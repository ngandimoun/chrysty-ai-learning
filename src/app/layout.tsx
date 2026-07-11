import type { Metadata } from 'next';
import { ChrystyLiveEmbedProvider } from '@chrysty/live-embed';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { APP_DESCRIPTION, APP_NAME } from '@/constants/navigation';
import 'katex/dist/katex.min.css';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning className="notranslate h-full">
      <body
        className={`notranslate ${plusJakarta.variable} ${geistMono.variable} h-full font-sans antialiased`}
        translate="no"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ChrystyLiveEmbedProvider
            worker="tutor"
            astraEmbedUrl={
              process.env.NEXT_PUBLIC_ASTRA_EMBED_URL ?? 'https://chrysty.chrysty.dev'
            }
          >
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ChrystyLiveEmbedProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

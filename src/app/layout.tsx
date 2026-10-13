import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";
import "./carbon.scss";

// Carbon's type scale uses 300, 400 and 600; the app adds 500. latin-ext covers Hungarian ő and ű.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Prévost operációs áttekintés", template: "%s · Prévost" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu" className={`${plexSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-text-primary">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

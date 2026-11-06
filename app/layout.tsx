import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { LANG_SCRIPT } from "@/lib/i18n";
import { SAVE_KEY } from "@/lib/save";
import { AUTHOR, SITE_URL } from "@/lib/site";
import "./globals.css";

const title = "Ordet: a daily word game in English and Danish";
const description =
  "Guess the five-letter word in six tries, in English or Danish. One word a day, the same for everyone, or as many as you like in Unlimited.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "Ordet",
  authors: [AUTHOR],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Ordet", title, description, locale: "en_US", alternateLocale: ["da_DK"] },
  twitter: { card: "summary_large_image", title, description },
  appleWebApp: { title: "Ordet" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

/** Applies a saved theme before the first paint, so a player who picked dark never sees a white flash */
const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})||"{}").settings||{},d=document.documentElement;if(s.theme==="dark"||s.theme==="light")d.dataset.theme=s.theme;if(s.contrast===true)d.dataset.contrast="high"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The scripts and the game set attributes on <html> that the server can't know
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

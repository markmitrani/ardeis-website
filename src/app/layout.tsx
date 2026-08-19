import type { Metadata } from "next";
import { Host_Grotesk, Six_Caps } from "next/font/google";
import "./globals.css";

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-host-grotesk",
  display: "swap",
});

// Used solely for the outlined GET IN TOUCH headline, which applies a
// synthetic oblique — Six Caps ships a single upright weight.
const sixCaps = Six_Caps({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-six-caps",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ardeis Tech Solutions",
  description:
    "We're a technical consultancy that works across disciplines. Ardeis is there for the whole process, from design to deployment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hostGrotesk.variable} ${sixCaps.variable}`}>
      <head>
        {/* Switzer is Fontshare-only, so it can't go through next/font. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600,700,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-grotesk bg-page text-ink">{children}</body>
    </html>
  );
}

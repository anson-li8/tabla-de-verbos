import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tabla de Verbos — Spanish Verb Mastery",
  description:
    "Master Spanish conjugation with classical verb tables and adaptive practice drills: conjugation, translation, timed challenges and infinite mode.",
  keywords: [
    "Spanish verbs",
    "conjugation",
    "verb tables",
    "Spanish practice",
    "subjunctive",
    "preterite",
  ],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Tabla de Verbos",
    description: "Classical verb tables + modern practice drills for Spanish conjugation mastery.",
    siteName: "Tabla de Verbos",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

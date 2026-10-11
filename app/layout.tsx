import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { MotionProvider } from "@/components/game/motion-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/app";
import "./globals.css";

const display = Archivo({ variable: "--font-display-face", subsets: ["latin"], axes: ["wdth"] });
const ui = Inter({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: "#edeae6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${display.variable} ${ui.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

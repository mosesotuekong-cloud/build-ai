import type { Metadata, Viewport } from "next";
import { Caladea, Carlito } from "next/font/google";
import { MotionProvider } from "@/components/game/motion-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/app";
import "./globals.css";

const display = Caladea({ variable: "--font-display-face", subsets: ["latin"], weight: ["700"] });
const ui = Carlito({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: "#fdf5e8",
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

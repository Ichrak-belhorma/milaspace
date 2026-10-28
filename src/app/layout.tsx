import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cinzel";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/lora";
import "@fontsource/varela-round";
import "@fontsource-variable/nunito";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/inter";
import "@fontsource/caveat"; // handwriting on the desk notebook's page
import { cssVarsToRule, NO_FLASH_SCRIPT, themeToCssVars } from "@/theme/cssVars";
import { DEFAULT_PRESET } from "@/theme/presets";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mila · your study space",
  description: "A cozy, customizable study room with a study system that makes progress hard to avoid.",
  applicationName: "Mila",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: DEFAULT_PRESET.tokens.background,
};

const DEFAULT_THEME_CSS = cssVarsToRule(themeToCssVars(DEFAULT_PRESET));

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style id="mila-default-theme" dangerouslySetInnerHTML={{ __html: DEFAULT_THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

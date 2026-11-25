"use client";

import { useEffect } from "react";
import { applyTheme, storedTheme, type Theme } from "@/components/theme/theme-script";

/** Keeps the device's theme in line with the theme saved on the profile. */
export function ThemeSync({ theme }: { theme: Theme | null }) {
  useEffect(() => {
    if (theme && storedTheme() !== theme) applyTheme(theme);
  }, [theme]);
  return null;
}

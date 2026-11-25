"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, storedTheme, type Theme } from "@/components/theme/theme-script";
import { saveSettings } from "@/app/(app)/profile/actions";

const ORDER: Theme[] = ["dark", "light", "system"];
const ICON = { dark: Moon, light: Sun, system: Monitor } as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => setTheme(storedTheme() ?? "dark"), []);
  const Icon = ICON[theme];

  return (
    <button
      aria-label={`Theme: ${theme}. Switch theme`}
      title={`Theme: ${theme}`}
      onClick={() => {
        const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
        setTheme(next);
        applyTheme(next);
        saveSettings({ theme: next }).catch(() => {});
      }}
      className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface hover:text-fg"
    >
      <Icon className="size-4.5" />
    </button>
  );
}

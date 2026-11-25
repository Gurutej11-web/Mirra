"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LocationPicker } from "@/components/planner/location-picker";
import { saveSettings } from "@/app/(app)/profile/actions";
import { applyTheme } from "@/components/theme/theme-script";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-xs text-fg-subtle">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-surface-2")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(profile.display_name ?? "");
  const [roast, setRoast] = useState(profile.roast_mode);
  const [hide, setHide] = useState(profile.hide_scores);
  const [units, setUnits] = useState(profile.units ?? "imperial");
  const [theme, setTheme] = useState(profile.theme ?? "dark");

  function save() {
    if (!name.trim()) return toast("Your name can't be empty.", { tone: "error" });
    start(async () => {
      const r = await saveSettings({ display_name: name.trim(), roast_mode: roast, hide_scores: hide, units, theme });
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast("Settings saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 space-y-6">
      <label className="block space-y-1.5">
        <span className="text-sm">Display name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent" />
      </label>

      <div className="space-y-1.5">
        <span className="text-sm">Weather location</span>
        <LocationPicker current={profile.location?.name ?? "Not set"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-sm">Temperature</span>
          <div className="flex rounded-xl bg-surface p-1 text-sm">
            {(["imperial", "metric"] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnits(u)} className={cn("h-9 flex-1 rounded-lg", units === u ? "bg-surface-2 text-fg" : "text-fg-subtle")}>
                {u === "imperial" ? "°F" : "°C"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-sm">Theme</span>
          <div className="flex rounded-xl bg-surface p-1 text-sm">
            {(["dark", "light", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  applyTheme(t);
                }}
                className={cn("h-9 flex-1 rounded-lg capitalize", theme === t ? "bg-surface-2 text-fg" : "text-fg-subtle")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Toggle on={roast} onChange={setRoast} label="Roast mode by default" hint="Fit Checks open in roast mode — funny, about the clothes only." />
      <Toggle on={hide} onChange={setHide} label="Hide scores" hint="Get the feedback and tips without any numbers." />

      <Button onClick={save} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save settings</Button>
    </div>
  );
}

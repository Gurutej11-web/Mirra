"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveBudget } from "@/app/(app)/profile/actions";

export function BudgetForm({ current }: { current: number | null }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current?.toString() ?? "");
  const [pending, start] = useTransition();

  if (!editing)
    return (
      <button onClick={() => setEditing(true)} className="flex shrink-0 items-center gap-1 text-xs text-fg-muted hover:text-fg">
        <Pencil className="size-3" /> {current != null ? "Edit budget" : "Set budget"}
      </button>
    );

  return (
    <form
      className="flex shrink-0 items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = value.trim() === "" ? null : Number(value);
        if (n != null && (!Number.isFinite(n) || n < 0)) return toast("Enter a valid amount.", { tone: "error" });
        start(async () => {
          const r = await saveBudget(n);
          if ("error" in r && r.error) toast(r.error, { tone: "error" });
          else {
            setEditing(false);
            router.refresh();
          }
        });
      }}
    >
      <span className="text-xs text-fg-subtle">$</span>
      <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm" placeholder="per month" />
      <button disabled={pending} className="h-8 rounded-lg bg-accent px-2.5 text-xs text-accent-fg">Save</button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const BUCKETS = ["closet", "fit-checks", "avatars"] as const;

export function DangerZone({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteEverything() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      // 1) remove every photo (paginated)
      for (const bucket of BUCKETS) {
        for (;;) {
          const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
          if (error) throw error;
          if (!data?.length) break;
          const { error: rmErr } = await supabase.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
          if (rmErr) throw rmErr;
          if (data.length < 100) break;
        }
      }
      // 2) delete the account (all rows cascade)
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/?deleted=1";
    } catch (e) {
      setError((e as Error).message || "Couldn't delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-danger/30 p-6">
      <h2 className="text-lg font-medium text-danger">Delete account</h2>
      <p className="mt-1 text-sm text-fg-muted">Permanently deletes your closet, outfits, Fit Checks, photos and account. This can&apos;t be undone.</p>
      {!open ? (
        <Button variant="ghost" className="mt-4 text-danger" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" /> Delete my account
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm">Type <strong>DELETE</strong> to confirm.</p>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="h-11 w-full rounded-xl border border-danger/40 bg-surface px-3.5 text-sm outline-none" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setConfirmText(""); }} disabled={busy}>Cancel</Button>
            <Button className="bg-danger text-white hover:bg-danger/90" disabled={confirmText !== "DELETE" || busy} onClick={deleteEverything}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete forever
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

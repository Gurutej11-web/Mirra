import { requireUser, jsonError } from "@/lib/api";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  // Prevent spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** GET /api/export?format=json|csv — download your data. */
export async function GET(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Please sign in.", 401);
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const { data } = await supabase.from("items").select("*").order("created_at");
    const cols = ["name", "category", "subcategory", "colors", "pattern", "material", "formality", "seasons", "tags", "brand", "price", "purchased_on", "times_worn", "last_worn", "status", "favorite", "archived", "notes", "source_url", "created_at"];
    const rows = [cols.join(","), ...(data ?? []).map((r) => cols.map((c) => csvCell((r as Record<string, unknown>)[c])).join(","))];
    return new Response(rows.join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mirra-closet-${stamp}.csv"` },
    });
  }

  const tables = ["profiles", "items", "outfits", "lookbooks", "fit_checks", "wear_log", "planner_entries", "wishlist", "chat_messages", "packing_lists"] as const;
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: user.email };
  for (const t of tables) {
    const { data } = await supabase.from(t).select("*");
    out[t] = data ?? [];
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="mirra-export-${stamp}.json"` },
  });
}

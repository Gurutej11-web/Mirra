"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function deleteFitCheck(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid id." };
  const supabase = await createClient();
  const { data } = await supabase.from("fit_checks").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("fit_checks").delete().eq("id", id);
  if (error) return { error: error.message };
  if (data?.photo_path) await supabase.storage.from("fit-checks").remove([data.photo_path]);
  revalidatePath("/fit-check");
  return { ok: true };
}

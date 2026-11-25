"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

/** Only allow redirects to paths inside this site. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/closet";
}

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent";

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const callbackError = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError ? "That sign-in link was invalid or expired. Please try again." : null,
  );
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is off — signed in right away.
          router.replace("/onboarding");
          router.refresh();
        } else {
          setSentTo(email);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        msg.includes("Invalid login credentials")
          ? "That email and password don't match."
          : msg.includes("Email not confirmed")
            ? "Confirm your email first — check your inbox for the link."
            : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="glass mt-10 rounded-3xl p-8 text-center">
        <MailCheck className="mx-auto size-10 text-accent" />
        <h1 className="mt-4 font-display text-3xl">Check your email</h1>
        <p className="mt-2 text-sm text-fg-muted">
          We sent a confirmation link to <span className="text-fg">{sentTo}</span>. Open it to finish
          creating your closet.
        </p>
        <button
          className="mt-6 text-sm text-accent hover:underline"
          onClick={() => {
            setSentTo(null);
            setMode("signin");
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="glass mt-10 rounded-3xl p-6 sm:p-8">
      <h1 className="text-center font-display text-4xl">
        {mode === "signin" ? "Welcome back" : "Start your closet"}
      </h1>
      <p className="mt-2 text-center text-sm text-fg-muted">
        {mode === "signin" ? "Sign in to see your wardrobe." : "It takes less than a minute."}
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-full bg-surface p-1 text-sm" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "h-9 rounded-full transition-colors",
              mode === m ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <input
            className={inputClass}
            placeholder="First name"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className={inputClass}
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          required
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}

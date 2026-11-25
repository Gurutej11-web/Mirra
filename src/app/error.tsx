"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="font-display text-6xl text-accent">Oops.</p>
        <h1 className="mt-3 font-display text-3xl">Something slipped off the hanger.</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Something went wrong loading this page. Your data is safe — try again, and if it keeps happening, reload the app.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">ref: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw className="size-4" /> Try again
          </Button>
          <ButtonLink href="/home" variant="secondary">Go home</ButtonLink>
        </div>
      </div>
    </div>
  );
}

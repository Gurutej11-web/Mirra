import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-12 font-display text-8xl text-accent">404</p>
        <h1 className="mt-2 font-display text-4xl">This look doesn&apos;t exist.</h1>
        <p className="mt-2 text-fg-muted">The page may have moved, or the item was deleted.</p>
        <div className="mt-8 flex justify-center gap-2">
          <ButtonLink href="/home">Go home</ButtonLink>
          <ButtonLink href="/closet" variant="secondary">Open closet</ButtonLink>
        </div>
      </div>
    </div>
  );
}

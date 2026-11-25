import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mirra wordmark: an arched mirror glyph + serif name. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 32"
        className="h-7 w-auto text-accent transition-transform duration-300 group-hover:-rotate-6"
        aria-hidden
      >
        <path
          d="M12 1.5C6.2 1.5 2 6 2 11.5V30.5h20V11.5C22 6 17.8 1.5 12 1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M7 12.5 12.5 7M7 18 16.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
      </svg>
      <span className="font-display text-2xl leading-none tracking-tight">Mirra</span>
    </Link>
  );
}

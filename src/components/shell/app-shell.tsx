"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/60 px-4 py-6 md:flex">
        <Logo href="/closet" className="px-3" />
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Main">
          {appNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-fg-muted hover:bg-surface hover:text-fg",
                )}
              >
                <Icon className={cn("size-4.5", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted hover:bg-surface hover:text-fg"
        >
          <span className="grid size-8 place-items-center rounded-full bg-accent font-medium text-accent-fg">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{userName}</span>
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden">
        <Logo href="/closet" />
      </header>

      <main className="flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 md:hidden"
      >
        {appNav
          .filter((n) => n.primary)
          .map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const center = href === "/fit-check";
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px]",
                  active ? "text-fg" : "text-fg-subtle",
                )}
              >
                {center ? (
                  <span className="-mt-7 grid size-13 place-items-center rounded-full bg-accent text-accent-fg shadow-[0_8px_30px_-8px_var(--accent)]">
                    <Icon className="size-5.5" />
                  </span>
                ) : (
                  <Icon className={cn("size-5", active && "text-accent")} />
                )}
                {label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

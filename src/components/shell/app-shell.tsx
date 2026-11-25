"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { appNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { CommandPalette, openPalette } from "@/components/shell/command-palette";
import { Shortcuts } from "@/components/shell/shortcuts";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/60 px-4 py-6 md:flex">
        <Logo href="/home" className="px-3" />
        <button
          onClick={openPalette}
          className="mt-8 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg-subtle hover:text-fg"
        >
          <Search className="size-4" /> Search
          <kbd className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[10px]">Ctrl K</kbd>
        </button>
        <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Main">
          {appNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface hover:text-fg",
                )}
              >
                <Icon className={cn("size-4.5", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted hover:bg-surface hover:text-fg"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-medium text-accent-fg">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{userName}</span>
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden">
        <Logo href="/home" />
        <div className="flex items-center gap-1">
          <button aria-label="Search" onClick={openPalette} className="grid size-10 place-items-center rounded-full text-fg-muted">
            <Search className="size-5" />
          </button>
          <ThemeToggle />
          <button aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="grid size-10 place-items-center rounded-full text-fg-muted">
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-x-0 top-14 z-30 border-b border-border bg-bg-elevated p-4 shadow-2xl md:hidden">
          <nav className="grid grid-cols-3 gap-2" aria-label="All sections">
            {appNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl p-3 text-xs",
                  isActive(pathname, href) ? "bg-surface-2 text-fg" : "text-fg-muted",
                )}
              >
                <Icon className="size-5" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
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
                className={cn("flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px]", active ? "text-fg" : "text-fg-subtle")}
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

      <CommandPalette />
      <Shortcuts />
    </div>
  );
}

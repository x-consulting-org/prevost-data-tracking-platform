import Image from "next/image";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "@/components/shell/nav-links";

/**
 * The asphalt bar: a top bar on small screens and a fixed sidebar from lg up. One element for
 * both, so the session-dependent `status` renders once.
 */
export function AppShell({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-layer px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Ugrás a tartalomra
      </a>
      <aside className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-asphalt px-3 md:px-6 lg:fixed lg:inset-y-0 lg:left-0 lg:h-auto lg:w-60 lg:flex-col lg:items-stretch lg:gap-8 lg:px-3 lg:py-6">
        <NextLink
          href="/shipments"
          className="flex shrink-0 flex-col gap-1 rounded-lg focus-visible:outline-2 focus-visible:outline-brand lg:px-3"
        >
          <Image src="/prevost-logo.png" alt="Prévost" width={100} height={18} priority />
          <span className="hidden text-xs text-asphalt-text lg:block">Operációs áttekintés</span>
        </NextLink>
        <nav aria-label="Fő navigáció">
          <NavLinks />
        </nav>
        <div className="ml-auto lg:mt-auto lg:ml-0">{status}</div>
      </aside>
      <main
        id="main-content"
        className="flex flex-1 flex-col gap-5 px-4 pt-6 pb-8 md:px-8 lg:pt-8 lg:pl-68"
      >
        {children}
      </main>
    </>
  );
}

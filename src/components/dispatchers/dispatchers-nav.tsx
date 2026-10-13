"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { href: "/dispatchers", label: "Értékelés" },
  { href: "/dispatchers/metrics", label: "Mérőszámok" },
] as const;

/** Links between the Kollégák pages; the current one is marked for screen readers too. */
export function DispatchersNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Kollégák oldalai" className="border-b border-border-subtle">
      <ul className="-mb-px flex gap-6">
        {pages.map(({ href, label }) => (
          <li key={href}>
            <NextLink
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="inline-flex border-b-2 border-transparent pb-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-focus aria-[current=page]:border-text-primary aria-[current=page]:text-text-primary"
            >
              {label}
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

import { DeliveryTruck, UserMultiple, type CarbonIconType } from "@carbon/icons-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const navItems: readonly { href: string; label: string; icon: CarbonIconType }[] = [
  { href: "/shipments", label: "Fuvarok", icon: DeliveryTruck },
  { href: "/dispatchers", label: "Kollégák", icon: UserMultiple },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex gap-1 lg:flex-col">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <li key={href}>
            <NextLink
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-asphalt-text transition-colors hover:bg-asphalt-raised hover:text-white focus-visible:outline-2 focus-visible:outline-brand aria-[current=page]:bg-asphalt-raised aria-[current=page]:text-white"
            >
              <Icon
                size={18}
                aria-hidden="true"
                className="sm:block hidden shrink-0 transition-colors group-aria-[current=page]:text-brand"
              />
              {label}
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}

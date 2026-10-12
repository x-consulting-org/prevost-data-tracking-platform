"use client";

import {
  Header,
  HeaderContainer,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Theme,
} from "@carbon/react";
import Image from "next/image";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/shipments", label: "Fuvarok" },
  { href: "/dispatchers", label: "Kollégák" },
] as const;

export function AppShell({
  headerActions,
  children,
}: {
  headerActions: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <HeaderContainer
        render={({ isSideNavExpanded, onClickSideNavExpand }) => (
          <Theme theme="g100">
            <Header aria-label="Prévost operációs áttekintés">
              <SkipToContent href="#main-content">Ugrás a tartalomra</SkipToContent>
              <HeaderMenuButton
                aria-label={isSideNavExpanded ? "Menü bezárása" : "Menü megnyitása"}
                onClick={onClickSideNavExpand}
                isActive={isSideNavExpanded}
                aria-expanded={isSideNavExpanded}
              />
              <HeaderName as={NextLink} href="/shipments" prefix="">
                <Image
                  src="/prevost-logo.png"
                  alt="Prévost"
                  width={90}
                  height={16}
                  className="mr-3 inline-block"
                />
                Operációs áttekintés
              </HeaderName>
              <HeaderGlobalBar>{headerActions}</HeaderGlobalBar>
              <SideNav
                aria-label="Fő navigáció"
                expanded={isSideNavExpanded}
                onSideNavBlur={onClickSideNavExpand}
                href="#main-content"
              >
                <SideNavItems>
                  {navItems.map((item) => (
                    <SideNavLink
                      key={item.href}
                      as={NextLink}
                      href={item.href}
                      isActive={pathname.startsWith(item.href)}
                    >
                      {item.label}
                    </SideNavLink>
                  ))}
                </SideNavItems>
              </SideNav>
            </Header>
          </Theme>
        )}
      />
      <main
        id="main-content"
        className="flex flex-1 flex-col gap-6 px-4 pt-16 pb-8 md:px-8 lg:pl-72"
      >
        {children}
      </main>
    </>
  );
}

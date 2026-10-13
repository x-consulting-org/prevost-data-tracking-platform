import type { ReactNode } from "react";
import { DispatchersNav } from "@/components/dispatchers/dispatchers-nav";

/** Both Kollégák pages: the review and the rules it is computed by. */
export default function DispatchersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Kollégák</h1>
        <DispatchersNav />
      </header>
      {children}
    </>
  );
}

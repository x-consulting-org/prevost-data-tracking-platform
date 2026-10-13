import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ShellStatus } from "@/components/shell/shell-status";
import { ShipmentDetailModal } from "@/components/shipments/shipment-detail-modal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      status={
        <Suspense fallback={null}>
          <ShellStatus />
        </Suspense>
      }
    >
      {children}
      <Suspense fallback={null}>
        <ShipmentDetailModal />
      </Suspense>
    </AppShell>
  );
}

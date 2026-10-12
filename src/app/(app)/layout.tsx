import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { HeaderStatus } from "@/components/shell/header-status";
import { ShipmentDetailModal } from "@/components/shipments/shipment-detail-modal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      headerActions={
        <Suspense fallback={null}>
          <HeaderStatus />
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

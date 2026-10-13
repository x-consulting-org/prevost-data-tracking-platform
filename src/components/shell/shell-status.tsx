import { getCurrentPrincipal } from "@/actions/session";
import { getSyncStates } from "@/actions/shipments";
import { LiveRefresh } from "@/components/shell/live-refresh";
import { UserMenu } from "@/components/shell/user-menu";
import { formatDateTime } from "@/lib/format";
import { dataSourceLabel } from "@/lib/shipments/sources";

/**
 * Shell data that needs the session: when the screen and each source last loaded, and who is
 * signed in. The data freshness is shown from lg up, where the sidebar has room for it.
 */
export async function ShellStatus() {
  const [syncStates, principal] = await Promise.all([getSyncStates(), getCurrentPrincipal()]);
  // Rendered again by every refresh, so it is when the screen's data was last read.
  const renderedAt = new Date();

  return (
    <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:gap-4">
      <section
        aria-label="Adatok frissessége"
        className="hidden flex-col gap-2.5 rounded-xl bg-sidebar-raised p-3 text-xs lg:flex"
      >
        <LiveRefresh renderedAt={renderedAt} />
        <dl className="flex flex-col gap-1.5 tabular-nums">
          {syncStates.map((state) => (
            <div key={state.source} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-sidebar-text">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${state.status === "synced" ? "bg-status-completed" : "bg-status-unhandled"}`}
                />
                {dataSourceLabel[state.source]}
              </dt>
              <dd className="text-white">
                {state.status === "synced"
                  ? formatDateTime(state.lastSyncedAt)
                  : "még nem töltött be"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <UserMenu user={{ id: principal.userId, name: principal.name }} />
    </div>
  );
}

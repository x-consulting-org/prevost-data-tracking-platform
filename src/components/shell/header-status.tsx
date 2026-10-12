import { getCurrentPrincipal } from "@/actions/session";
import { getSyncStates } from "@/actions/shipments";
import { UserMenu } from "@/components/shell/user-menu";
import { formatDateTime } from "@/lib/format";
import { dataSourceLabel } from "@/lib/shipments/sources";

/** Header data that needs the session: when each source last loaded, and who is signed in. */
export async function HeaderStatus() {
  const [syncStates, principal] = await Promise.all([getSyncStates(), getCurrentPrincipal()]);

  return (
    <>
      <dl className="hidden items-center gap-4 px-4 text-sm text-text-secondary tabular-nums lg:flex">
        {syncStates.map((state) => (
          <div key={state.source} className="flex gap-1">
            <dt>{dataSourceLabel[state.source]}:</dt>
            <dd className="text-text-primary">
              {state.status === "synced"
                ? formatDateTime(state.lastSyncedAt)
                : "még nem töltött be"}
            </dd>
          </div>
        ))}
      </dl>
      <UserMenu name={principal.name} />
    </>
  );
}

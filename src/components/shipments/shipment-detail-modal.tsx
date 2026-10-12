"use client";

import {
  Button,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalHeader,
  SkeletonText,
  Tag,
} from "@carbon/react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { getShipmentDetail } from "@/actions/shipments";
import { AlertList } from "@/components/shipments/alert-list";
import { DispatcherTag } from "@/components/shipments/dispatcher-tag";
import {
  closeShipmentDetail,
  shipmentDetailParam,
} from "@/components/shipments/shipment-detail-url";
import { ShipmentStatusTag } from "@/components/shipments/status-tag";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { shipmentDetailInputSchema } from "@/lib/shipments/schemas";
import { dataSourceLabel } from "@/lib/shipments/sources";
import type { ShipmentDetail } from "@/server/shipments";

const missing = "nincs megadva";

/**
 * Shipment detail for `?shipment=<id>` on any app screen. The URL is the open state, so every
 * way of closing (Esc, outside click, the header's close button) only removes the param.
 * The header sits below ComposedModal's direct children, hence its own `buttonOnClick`.
 */
export function ShipmentDetailModal() {
  const shipmentId = useSearchParams().get(shipmentDetailParam);

  return (
    <ComposedModal
      open={shipmentId !== null}
      onClose={closeShipmentDetail}
      size="lg"
      aria-label="Fuvar részletei"
    >
      {shipmentId === null ? null : <ShipmentDetailContent key={shipmentId} id={shipmentId} />}
    </ComposedModal>
  );
}

function ShipmentDetailContent({ id }: { id: string }) {
  // A malformed id in the URL cannot name a shipment; it is not sent to the server.
  const isValidId = shipmentDetailInputSchema.safeParse({ id }).success;
  const query = useQuery({
    queryKey: queryKeys.shipments.detail(id),
    queryFn: () => getShipmentDetail({ id }),
    enabled: isValidId,
  });

  if (!isValidId || query.data === null) {
    return <DetailFrame title="Fuvar">Ez a fuvar nem található.</DetailFrame>;
  }
  if (query.isError) {
    return (
      <DetailFrame title="Fuvar">
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="A fuvar betöltése nem sikerült."
          subtitle="Próbáld újra."
        />
        <Button kind="tertiary" size="sm" className="mt-4" onClick={() => void query.refetch()}>
          Újrapróbálás
        </Button>
      </DetailFrame>
    );
  }
  if (query.data === undefined) {
    return (
      <DetailFrame title="Fuvar">
        <SkeletonText paragraph lineCount={6} />
      </DetailFrame>
    );
  }

  return <ShipmentDetailBody shipment={query.data} />;
}

function DetailFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <ModalHeader
        label="Fuvar"
        title={title}
        iconDescription="Bezárás"
        buttonOnClick={closeShipmentDetail}
      />
      <ModalBody>{children}</ModalBody>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Stop({ city, country, at }: { city: string; country: string; at: Date | null }) {
  return (
    <>
      {city} {country}
      <span className="block text-text-secondary tabular-nums">
        {at === null ? missing : formatDateTime(at)}
      </span>
    </>
  );
}

function ShipmentDetailBody({ shipment }: { shipment: ShipmentDetail }) {
  return (
    <>
      <ModalHeader label="Fuvar" iconDescription="Bezárás" buttonOnClick={closeShipmentDetail}>
        <h2 className="flex flex-wrap items-center gap-3 text-xl">
          <span className="font-mono">{shipment.reference}</span>
          <ShipmentStatusTag status={shipment.status} />
        </h2>
      </ModalHeader>
      <ModalBody hasScrollingContent aria-label="Fuvar részletei">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <AlertList alerts={shipment.alerts} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Megbízó">{shipment.customer.name}</Field>
              <Field label="Kolléga">
                <DispatcherTag dispatcher={shipment.dispatcher} />
              </Field>
              <Field label="Felrakás">
                <Stop
                  city={shipment.originCity}
                  country={shipment.originCountry}
                  at={shipment.pickupAt}
                />
              </Field>
              <Field label="Lerakás">
                <Stop
                  city={shipment.destinationCity}
                  country={shipment.destinationCountry}
                  at={shipment.deliveryAt}
                />
              </Field>
              <Field label="T-Port járat">
                {shipment.tportTripId === null ? (
                  missing
                ) : (
                  <span className="font-mono">{shipment.tportTripId}</span>
                )}
              </Field>
              <Field label="Igény érkezett">{formatDateTime(shipment.requestedAt)}</Field>
              <Field label="Áru">{shipment.cargoDescription ?? missing}</Field>
              <Field label="Különleges igény">{shipment.specialRequirements ?? missing}</Field>
            </dl>
          </div>

          <section aria-labelledby="shipment-events" className="flex flex-col gap-3">
            <h3 id="shipment-events" className="text-sm font-semibold">
              Események
            </h3>
            {shipment.events.length === 0 ? (
              <p className="text-sm text-text-secondary">Nincs rögzített esemény.</p>
            ) : null}
            <ol className="flex flex-col gap-4 border-l border-border-subtle pl-4">
              {shipment.events.map((event) => (
                <li key={event.id} className="flex flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <time dateTime={event.occurredAt.toISOString()} className="tabular-nums">
                      {formatDateTime(event.occurredAt)}
                    </time>
                    <Tag type="outline" size="sm" className="m-0">
                      {dataSourceLabel[event.source]}
                    </Tag>
                  </div>
                  <p>{event.summary}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ModalBody>
    </>
  );
}

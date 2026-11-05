"use client";

import { createRef } from "react";

/**
 * The open shipment detail lives in the `?shipment=<id>` search param, so it survives a reload
 * and can be shared. It is client state: the history API updates `useSearchParams` without
 * a server round trip, and server pages ignore the param.
 */
export const shipmentDetailParam = "shipment";

/** The button that opened the detail, so closing it returns keyboard focus there. */
export const shipmentDetailLauncher = createRef<HTMLButtonElement>();

function urlWithShipment(id: string | null): URL {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete(shipmentDetailParam);
  } else {
    url.searchParams.set(shipmentDetailParam, id);
  }
  return url;
}

/** A new history entry, so Back closes the detail again. */
export function openShipmentDetail(id: string, launcher: HTMLButtonElement) {
  shipmentDetailLauncher.current = launcher;
  window.history.pushState(null, "", urlWithShipment(id));
}

/** Replaces the entry, so Back after closing does not reopen it. */
export function closeShipmentDetail() {
  window.history.replaceState(null, "", urlWithShipment(null));
}

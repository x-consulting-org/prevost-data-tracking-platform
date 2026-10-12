import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStatusBoard, listDispatchers } from "@/actions/shipments";
import { BoardSkeleton } from "@/components/shipments/board-skeleton";
import { ShipmentsTable } from "@/components/shipments/shipments-table";
import { ShipmentsToolbar } from "@/components/shipments/shipments-toolbar";
import { StatusBoard } from "@/components/shipments/status-board";
import { shipmentsSearchParamsSchema } from "@/lib/shipments/schemas";

export const metadata: Metadata = {
  title: "Fuvarok",
};

export default function ShipmentsPage({ searchParams }: PageProps<"/shipments">) {
  return (
    <>
      <h1 className="text-2xl">Fuvarok</h1>
      <Suspense fallback={<BoardSkeleton />}>
        <Shipments searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Shipments({ searchParams }: Pick<PageProps<"/shipments">, "searchParams">) {
  const parsed = shipmentsSearchParamsSchema.safeParse(await searchParams);
  if (!parsed.success) {
    notFound();
  }
  const { view, filter } = parsed.data;

  // Only the kanban is rendered here (`board` is null in table view); the table pages on the client.
  const [dispatchers, board] = await Promise.all([
    listDispatchers(),
    view === "kanban" ? getStatusBoard(filter) : null,
  ]);
  if (
    filter.dispatcherId !== undefined &&
    !dispatchers.some((dispatcher) => dispatcher.id === filter.dispatcherId)
  ) {
    notFound();
  }

  return (
    <>
      <ShipmentsToolbar view={view} filter={filter} dispatchers={dispatchers} />
      {board === null ? (
        <ShipmentsTable key={JSON.stringify(filter)} filter={filter} />
      ) : (
        <StatusBoard board={board} />
      )}
    </>
  );
}

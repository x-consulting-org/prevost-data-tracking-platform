import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStatusBoard, listDispatchers } from "@/actions/shipments";
import { BoardSkeleton } from "@/components/shipments/board-skeleton";
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
  const { filter } = parsed.data;

  const [dispatchers, board] = await Promise.all([listDispatchers(), getStatusBoard(filter)]);

  return (
    <>
      <ShipmentsToolbar filter={filter} dispatchers={dispatchers} />
      <StatusBoard board={board} />
    </>
  );
}

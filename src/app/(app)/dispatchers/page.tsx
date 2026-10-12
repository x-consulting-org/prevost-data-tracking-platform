import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDispatcherBoard } from "@/actions/shipments";
import { DispatcherBoard } from "@/components/dispatchers/dispatcher-board";
import { DispatcherBoardSkeleton } from "@/components/dispatchers/dispatcher-board-skeleton";
import { dispatchersSearchParamsSchema } from "@/lib/shipments/schemas";

export const metadata: Metadata = {
  title: "Kollégák",
};

export default function DispatchersPage({ searchParams }: PageProps<"/dispatchers">) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kollégák</h1>
        <p className="text-sm text-text-secondary">
          Ki mivel foglalkozik, és kinél van figyelmet igénylő fuvar.
        </p>
      </header>
      <Suspense fallback={<DispatcherBoardSkeleton />}>
        <Dispatchers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Dispatchers({ searchParams }: Pick<PageProps<"/dispatchers">, "searchParams">) {
  const parsed = dispatchersSearchParamsSchema.safeParse(await searchParams);
  if (!parsed.success) {
    notFound();
  }

  const board = await getDispatcherBoard();
  const focusedDispatcherId = parsed.data.dispatcher;
  if (
    focusedDispatcherId !== undefined &&
    !board.columns.some((column) => column.dispatcher.id === focusedDispatcherId)
  ) {
    notFound();
  }

  return <DispatcherBoard board={board} focusedDispatcherId={focusedDispatcherId} />;
}

"use client";

import {
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCreateAtom, useSelector } from "@tanstack/react-store";
import {
  createColumnHelper,
  FlexRender,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { listShipmentsPage } from "@/actions/shipments";
import { ColumnResizeHandles } from "@/components/data-table/column-resize-handles";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useFittedColumns, type FittableColumn } from "@/components/data-table/use-fitted-columns";
import { AttentionIcon } from "@/components/shipments/alert-list";
import { DispatcherLink } from "@/components/shipments/dispatcher-link";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { ShipmentStatusBadge } from "@/components/shipments/status-badge";
import { columnLabel, dataTableFeatures, sortActionLabel } from "@/lib/data-table";
import { formatDateTime } from "@/lib/format";
import { pageSizeOptions } from "@/lib/pagination";
import { queryKeys } from "@/lib/query-keys";
import { describeShipmentAlert } from "@/lib/shipments/alerts";
import { sortableShipmentColumnSchema, type ShipmentFilter } from "@/lib/shipments/schemas";
import { shipmentStatusLabel } from "@/lib/shipments/status";
import type { ShipmentCard } from "@/server/shipments";

type ShipmentColumn = FittableColumn<ShipmentCard> & {
  /** Rich cell content; plain `text` is rendered when absent. */
  render?: (shipment: ShipmentCard) => ReactNode;
};

// Carbon `sm` cells have 16px padding on each side. The status badge adds its padding and dot,
// the dispatcher link its avatar and padding.
const cellPadding = 32;
const badgeChrome = cellPadding + 30;
const dispatcherChrome = cellPadding + 36;

const dateTimeText = (date: Date | null) =>
  date === null ? "nincs megadva" : formatDateTime(date);

/** Column limits live here and only here; every column has a minimum and a maximum. */
const shipmentColumns: readonly ShipmentColumn[] = [
  {
    id: "reference",
    header: "Referencia",
    text: (shipment) => shipment.reference,
    // Stretched over the row, so the whole row opens the detail.
    render: (shipment) => <ShipmentReferenceButton shipment={shipment} stretched />,
    weight: "semibold",
    sortable: true,
    chrome: cellPadding,
    minSize: 120,
    maxSize: 180,
  },
  {
    id: "customer",
    header: "Megbízó",
    text: (shipment) => shipment.customer.name,
    weight: "regular",
    sortable: true,
    chrome: cellPadding,
    minSize: 140,
    maxSize: 320,
  },
  {
    id: "pickupAt",
    header: "Felrakás",
    text: (shipment) => dateTimeText(shipment.pickupAt),
    weight: "regular",
    sortable: true,
    chrome: cellPadding,
    minSize: 112,
    maxSize: 180,
  },
  {
    id: "origin",
    header: "Honnan",
    text: (shipment) => `${shipment.originCity} ${shipment.originCountry}`,
    weight: "regular",
    sortable: false,
    chrome: cellPadding,
    minSize: 120,
    maxSize: 260,
  },
  {
    id: "deliveryAt",
    header: "Lerakás",
    text: (shipment) => dateTimeText(shipment.deliveryAt),
    weight: "regular",
    sortable: true,
    chrome: cellPadding,
    minSize: 112,
    maxSize: 180,
  },
  {
    id: "destination",
    header: "Hová",
    text: (shipment) => `${shipment.destinationCity} ${shipment.destinationCountry}`,
    weight: "regular",
    sortable: false,
    chrome: cellPadding,
    minSize: 120,
    maxSize: 260,
  },
  {
    id: "status",
    header: "Státusz",
    text: (shipment) => shipmentStatusLabel[shipment.status],
    render: (shipment) => <ShipmentStatusBadge status={shipment.status} />,
    weight: "regular",
    sortable: true,
    chrome: badgeChrome,
    minSize: 120,
    maxSize: 200,
  },
  {
    id: "dispatcher",
    header: "Kolléga",
    text: (shipment) => shipment.dispatcher.name,
    render: (shipment) => (
      <DispatcherLink dispatcher={shipment.dispatcher} className="relative z-10 -ml-0.5" />
    ),
    weight: "regular",
    sortable: true,
    chrome: dispatcherChrome,
    minSize: 120,
    maxSize: 220,
  },
  {
    id: "tportTripId",
    header: "T-Port járat",
    text: (shipment) => shipment.tportTripId ?? "nincs",
    weight: "regular",
    sortable: false,
    chrome: cellPadding,
    minSize: 112,
    maxSize: 160,
  },
  {
    id: "alerts",
    header: "Jelzés",
    text: (shipment) => shipment.alerts.map(describeShipmentAlert).join("; "),
    render: (shipment) =>
      shipment.alerts.length === 0 ? null : (
        <span className="flex items-center gap-2">
          <AttentionIcon />
          <span className="truncate">{shipment.alerts.map(describeShipmentAlert).join("; ")}</span>
        </span>
      ),
    weight: "regular",
    sortable: false,
    chrome: cellPadding + 24,
    minSize: 160,
    maxSize: 420,
  },
];

const helper = createColumnHelper<typeof dataTableFeatures, ShipmentCard>();
const emptyRows: ShipmentCard[] = [];

// Cells render in the weight they were measured in.
const weightClassName = { regular: "font-normal", semibold: "font-semibold" } as const;

const carbonSortDirection = { asc: "ASC", desc: "DESC" } as const;

export function ShipmentsTable({ filter }: { filter: ShipmentFilter }) {
  const paginationAtom = useCreateAtom<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions[1],
  });
  const sortingAtom = useCreateAtom<SortingState>([]);
  const pagination = useSelector(paginationAtom, (value) => value);
  const sorting = useSelector(sortingAtom, (value) => value);

  const pageInput = {
    ...pagination,
    // Only sortable columns enable sorting, so any other id is a bug and throws here.
    sorting: sorting.map(({ id, desc }) => ({ id: sortableShipmentColumnSchema.parse(id), desc })),
    filter,
  };
  const { data } = useQuery({
    queryKey: queryKeys.shipments.page(pageInput),
    queryFn: () => listShipmentsPage(pageInput),
    placeholderData: keepPreviousData,
    throwOnError: true,
  });

  const rows = data?.items ?? emptyRows;
  const fittedColumns = useFittedColumns(shipmentColumns, rows);

  // The fitted width is the column's default size; a manual resize overrides it until reset.
  const columns = helper.columns(
    fittedColumns.map((spec) =>
      helper.accessor((shipment) => spec.text(shipment), {
        id: spec.id,
        header: spec.header,
        cell: ({ row }) => (
          <span className={weightClassName[spec.weight]}>
            {spec.render ? spec.render(row.original) : spec.text(row.original)}
          </span>
        ),
        enableSorting: spec.sortable,
        size: spec.size,
        minSize: spec.minSize,
        maxSize: spec.maxSize,
      }),
    ),
  );

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    rowCount: data?.rowCount,
    atoms: { pagination: paginationAtom, sorting: sortingAtom },
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    columnResizeMode: "onChange",
  });

  if (data === undefined) {
    return (
      <DataTableSkeleton
        columnCount={shipmentColumns.length}
        rowCount={pagination.pageSize}
        showHeader={false}
        showToolbar={false}
        aria-label="Fuvarok betöltése"
      />
    );
  }

  return (
    <TableContainer>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width: table.getTotalSize() }}>
          <Table size="sm" className="table-fixed">
            <colgroup>
              {table.getFlatHeaders().map((header) => (
                <col key={header.id} style={{ width: header.getSize() }} />
              ))}
            </colgroup>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const { column } = header;
                    const label = columnLabel(column);
                    const sorted = column.getIsSorted();
                    return (
                      <TableHeader
                        key={header.id}
                        isSortable={column.getCanSort()}
                        isSortHeader={sorted !== false}
                        sortDirection={sorted === false ? "NONE" : carbonSortDirection[sorted]}
                        translateWithId={() => sortActionLabel(label, column.getNextSortingOrder())}
                        onClick={column.getToggleSortingHandler()}
                      >
                        {label}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={shipmentColumns.length}>
                    Nincs a szűrőnek megfelelő fuvar.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="relative cursor-pointer">
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="truncate" title={String(cell.getValue())}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ColumnResizeHandles table={table} />
        </div>
      </div>
      <DataTablePagination
        pagination={table.state.pagination}
        rowCount={table.getRowCount()}
        onPaginationChange={table.setPagination}
      />
    </TableContainer>
  );
}

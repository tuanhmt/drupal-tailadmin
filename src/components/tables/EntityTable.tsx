import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type TColumn<TItem> = {
  key: string;
  header: string;
  className?: string;
  render: (item: TItem) => ReactNode;
};

type EntityTableProps<TItem> = {
  columns: TColumn<TItem>[];
  items: TItem[];
  getRowKey: (item: TItem) => string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  minWidthClassName?: string;
};

export default function EntityTable<TItem>({
  columns,
  items,
  getRowKey,
  emptyMessage = "No records found.",
  toolbar,
  footer,
  minWidthClassName = "min-w-[1102px]",
}: EntityTableProps<TItem>) {
  return (
    <div>
      {toolbar ? (
        <div className="border-b border-gray-200 p-4 dark:border-white/5">
          {toolbar}
        </div>
      ) : null}

      <div className="overflow-hidden border-b border-gray-100 dark:border-white/3">
        <div className="max-w-full overflow-x-auto">
          <div className={minWidthClassName}>
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/3">
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      isHeader
                      className={`px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${column.className ?? ""}`}
                    >
                      {column.header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/3">
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
                      {emptyMessage}
                    </TableCell>
                    {columns.slice(1).map((column) => (
                      <TableCell key={column.key} className="px-5 py-6">
                        &nbsp;
                      </TableCell>
                    ))}
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={getRowKey(item)}>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={`px-5 py-4 text-start text-sm ${column.className ?? ""}`}
                        >
                          {column.render(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}

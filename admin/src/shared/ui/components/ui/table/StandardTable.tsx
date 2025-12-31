import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from './index';
import Pagination, { PaginationProps } from '../pagination/Pagination';
import EmptyState, { EmptyStateProps } from '../empty-state/EmptyState';
import LoadingState from '../loading/LoadingState';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string; // Optional column-specific className
}

export interface StandardTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: EmptyStateProps;
  pagination?: PaginationProps;
  onRowClick?: (row: T) => void;
  rowClassName?: string | ((row: T) => string);
  className?: string;
}

export default function StandardTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyState,
  pagination,
  onRowClick,
  rowClassName = '',
  className = '',
}: StandardTableProps<T>) {
  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const getRowClassName = (row: T) => {
    const clickableClass = onRowClick ? 'cursor-pointer' : '';
    const hoverClass = onRowClick ? 'hover:bg-gray-50 dark:hover:bg-white/[0.02]' : '';
    const customClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
    return `${clickableClass} ${hoverClass} ${customClass}`.trim();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Table container with horizontal scroll */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-gray-800">
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider overflow-hidden ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              /* Loading state - skeleton rows */
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <LoadingState variant="skeleton" rows={5} columns={columns.length} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              /* Empty state */
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ? (
                    <EmptyState {...emptyState} />
                  ) : (
                    <EmptyState message="No data available" />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              /* Data rows */
              data.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={`border-b border-gray-200 dark:border-gray-800 ${getRowClassName(row)}`}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={`px-4 py-4 text-sm text-gray-900 dark:text-gray-100 overflow-hidden ${
                        column.className || ''
                      }`}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - always show for consistency */}
      {pagination && !loading && (
        <Pagination {...pagination} />
      )}
    </div>
  );
}

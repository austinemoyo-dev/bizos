'use client';

import { SkeletonRow } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  keyExtractor?: (row: T) => string;
  /** Mobile card renderer — when provided, renders cards on mobile instead of a table */
  mobileRender?: (row: T, index: number) => React.ReactNode;
}

export function DataTable<T extends object>({
  columns, data, onRowClick, loading,
  emptyMessage = 'No data found',
  emptyAction,
  keyExtractor,
  mobileRender,
}: DataTableProps<T>) {

  const isEmpty = !loading && data.length === 0;

  return (
    <>
      {/* Desktop table */}
      <div className={mobileRender ? 'desktop-table-wrap' : ''} style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className={col.numeric ? 'numeric' : ''}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState title={emptyMessage} action={emptyAction} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={keyExtractor ? keyExtractor(row) : idx}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : undefined }}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={col.numeric ? 'numeric' : ''}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      {mobileRender && (
        <div className="mobile-card-list">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mobile-txn-card">
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 14 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: '40%', height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 60, height: 16 }} />
                </div>
              </div>
            ))
          ) : isEmpty ? (
            <EmptyState title={emptyMessage} action={emptyAction} />
          ) : (
            data.map((row, idx) => (
              <div
                key={keyExtractor ? keyExtractor(row) : idx}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : undefined }}
              >
                {mobileRender(row, idx)}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

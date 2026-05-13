'use client';

import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={clsx('skeleton', className)}
      style={{ width, height: height ?? '1rem' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Skeleton width="40%" height="0.75rem" />
      <Skeleton width="60%" height="2rem" />
      <Skeleton width="30%" height="0.75rem" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} style={{ padding: 'var(--space-4)' }}>
          <Skeleton width={i === 0 ? '80%' : '60%'} height="0.875rem" />
        </td>
      ))}
    </tr>
  );
}

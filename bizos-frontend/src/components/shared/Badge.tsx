'use client';

type BadgeVariant =
  | 'received' | 'diagnosed' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
  | 'paid' | 'unpaid' | 'overdue'
  | 'profit' | 'loss'
  | 'info' | 'warning';

const LABELS: Record<BadgeVariant, string> = {
  received:    'Received',
  diagnosed:   'Diagnosed',
  in_progress: 'In Progress',
  completed:   'Completed',
  delivered:   'Delivered',
  cancelled:   'Cancelled',
  paid:        'Paid',
  unpaid:      'Unpaid',
  overdue:     'Overdue',
  profit:      'Profit',
  loss:        'Loss',
  info:        'Info',
  warning:     'Warning',
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
}

export function Badge({ variant, label, children }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {children ?? label ?? LABELS[variant]}
    </span>
  );
}

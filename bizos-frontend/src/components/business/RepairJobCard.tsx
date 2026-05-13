'use client';

import { Badge } from '@/components/shared/Badge';
import { formatNaira, formatDate } from '@/lib/format';
import { RepairJob, RepairStatus } from '@/types/api';
import { Phone, ChevronRight } from 'lucide-react';

interface RepairJobCardProps {
  job: RepairJob;
  onClick?: (job: RepairJob) => void;
  /** compact = dashboard list row; full = standalone card with more detail */
  variant?: 'compact' | 'full';
  showBorder?: boolean;
}

export function RepairJobCard({ job, onClick, variant = 'compact', showBorder = true }: RepairJobCardProps) {
  if (variant === 'full') {
    return (
      <div
        className="card"
        onClick={() => onClick?.(job)}
        style={{
          padding: 'var(--space-4)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
        onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              color: 'var(--accent-primary)', fontWeight: 700,
              background: 'var(--accent-primary-glow)', padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}>
              #{job.job_number}
            </span>
            <Badge variant={job.status as RepairStatus} />
          </div>
          {onClick && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>

        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {job.customer_name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          {job.device_type}{job.device_model ? ` · ${job.device_model}` : ''}
        </p>

        {job.fault_description && (
          <p style={{
            fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
            lineHeight: 1.5, marginBottom: 'var(--space-3)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {job.fault_description}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Charge</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatNaira(job.total_charge)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Received</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {formatDate(job.received_at)}
              </p>
            </div>
          </div>
          {job.customer_phone && (
            <a
              href={`tel:${job.customer_phone}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 'var(--text-xs)', color: 'var(--accent-primary)',
                textDecoration: 'none',
              }}
            >
              <Phone size={12} /> Call
            </a>
          )}
        </div>
      </div>
    );
  }

  // compact variant — row style (for dashboard list)
  return (
    <div
      onClick={() => onClick?.(job)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: showBorder ? '1px solid var(--border-subtle)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
        color: 'var(--accent-primary)', fontWeight: 700,
      }}>
        #{job.job_number}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.customer_name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {job.device_type}{job.device_model ? ` · ${job.device_model}` : ''}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <Badge variant={job.status as RepairStatus} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 3 }}>
          {formatNaira(job.total_charge)}
        </p>
      </div>
    </div>
  );
}

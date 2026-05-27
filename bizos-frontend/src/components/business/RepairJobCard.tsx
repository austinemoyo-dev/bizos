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

  // compact variant — fintech transaction row
  const initials = job.customer_name
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const avatarColors: Record<string, string> = {
    A: '#8B0018', B: '#0E7490', C: '#6D28D9', D: '#B45309', E: '#065F46',
    F: '#7C3AED', G: '#DC2626', H: '#0369A1', I: '#15803D', J: '#92400E',
    K: '#7E22CE', L: '#0F766E', M: '#B91C1C', N: '#1D4ED8', O: '#166534',
    P: '#C2410C', Q: '#6B21A8', R: '#0C4A6E', S: '#14532D', T: '#78350F',
    U: '#581C87', V: '#134E4A', W: '#7F1D1D', X: '#1E3A5F', Y: '#1A3A1A', Z: '#3B0764',
  };
  const avatarBg = avatarColors[initials[0]] ?? '#8B0018';

  return (
    <div
      onClick={() => onClick?.(job)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px',
        borderBottom: showBorder ? '1px solid var(--border-subtle)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar circle */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${avatarBg}, ${avatarBg}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 800, color: '#fff',
        letterSpacing: '0.02em',
        boxShadow: `0 2px 8px ${avatarBg}50`,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'var(--text-sm)', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: 'var(--text-primary)', marginBottom: 2,
        }}>
          {job.customer_name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {job.device_type}{job.device_model ? ` · ${job.device_model}` : ''}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4,
        }}>
          {formatNaira(job.total_charge)}
        </p>
        <Badge variant={job.status as RepairStatus} />
      </div>
    </div>
  );
}

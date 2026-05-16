'use client';

import { SavingsGoal } from '@/types/api';
import { formatNaira, formatDate } from '@/lib/format';
import { PiggyBank, Target, Pencil } from 'lucide-react';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onDeposit: (id: string) => void;
  onEdit?: (goal: SavingsGoal) => void;
}

export function SavingsGoalCard({ goal, onDeposit, onEdit }: SavingsGoalCardProps) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <div className="liquid-card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: isComplete ? 'var(--accent-green-glow)' : 'var(--accent-purple-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isComplete
                ? <Target size={18} style={{ color: 'var(--accent-green)' }} />
                : <PiggyBank size={18} style={{ color: 'var(--accent-purple)' }} />
              }
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{goal.title}</p>
              {goal.deadline && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  By {formatDate(goal.deadline)}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {onEdit && (
              <button className="btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
                onClick={() => onEdit(goal)}>
                <Pencil size={12} />
              </button>
            )}
            {!isComplete && (
              <button className="btn-primary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                onClick={() => onDeposit(goal.id)}>
                Deposit
              </button>
            )}
          </div>
        </div>

        {/* Amounts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: isComplete ? 'var(--accent-green)' : 'var(--accent-purple)' }}>
            {formatNaira(goal.current_amount)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            / {formatNaira(goal.target_amount)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 3, overflow: 'hidden',
          background: 'var(--glass-bg-light)',
          border: '1px solid var(--glass-border)',
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: isComplete
              ? 'linear-gradient(90deg, var(--accent-green), #34d399)'
              : 'linear-gradient(90deg, var(--accent-purple), #a855f7)',
            borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', textAlign: 'right' }}>
          {progress.toFixed(0)}% {isComplete && '✓'}
        </p>
      </div>
    </div>
  );
}


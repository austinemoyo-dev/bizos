'use client';

import { useMemo } from 'react';
import { FoodVendorAnalytics, FoodTrendPoint, VendorSpendingSummary } from '@/lib/api/food-vendor';
import { FoodVendorPayment } from '@/types/api';
import { formatNaira } from '@/lib/format';
import {
  Lightbulb, TrendingUp, TrendingDown, Calendar,
  Target, AlertTriangle, CheckCircle, Utensils, Clock, Wallet,
} from 'lucide-react';

interface Props {
  analytics: FoodVendorAnalytics | undefined;
  trend: FoodTrendPoint[];
  vendors: VendorSpendingSummary[];
  payments: FoodVendorPayment[];
}

const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

interface Insight {
  icon: React.ElementType;
  title: string;
  message: string;
  color: string;
  value?: string;
}

export function FoodVendorInsights({ analytics, trend, vendors, payments }: Props) {
  const insights = useMemo<Insight[]>(() => {
    if (!analytics) return [];
    const result: Insight[] = [];

    const outstanding   = toNum(analytics.total_outstanding);
    const totalPaid     = toNum(analytics.total_paid);
    const dailyAvg      = toNum(analytics.daily_average);
    const weeklyTotal   = toNum(analytics.weekly_total);
    const monthlyTotal  = toNum(analytics.monthly_total);
    const unpaidCount   = analytics.unpaid_count;

    // 1 — Outstanding balance
    if (outstanding > 0) {
      result.push({
        icon: outstanding > 5000 ? AlertTriangle : Utensils,
        title: 'Outstanding Balance',
        message: `You owe ${formatNaira(outstanding)} across ${unpaidCount} unpaid credit${unpaidCount !== 1 ? 's' : ''}. Clear this to keep your spending record clean.`,
        color: outstanding > 5000 ? '#EF4444' : '#F59E0B',
        value: formatNaira(outstanding),
      });
    }

    // 2 — Daily average
    if (dailyAvg > 0) {
      result.push({
        icon: Calendar,
        title: 'Daily Spending Average',
        message: `You're averaging ${formatNaira(dailyAvg)} per day on food this week.`,
        color: '#8B5CF6',
        value: formatNaira(dailyAvg) + '/day',
      });
    }

    // 3 — Monthly projection from daily avg
    if (dailyAvg > 0) {
      const projection = dailyAvg * 30;
      const isHigh = projection > 50000;
      result.push({
        icon: isHigh ? AlertTriangle : Target,
        title: 'Monthly Projection',
        message: isHigh
          ? `At this pace you'll spend ${formatNaira(projection)} on food this month — consider cutting back.`
          : `You're on track to spend about ${formatNaira(projection)} on food this month.`,
        color: isHigh ? '#EF4444' : '#10B981',
        value: formatNaira(projection),
      });
    }

    // 4 — Top vendor
    if (vendors.length > 0) {
      const top = vendors[0];
      result.push({
        icon: TrendingUp,
        title: 'Most Spent Vendor',
        message: `${top.vendor_name} leads with ${top.total_meals} meal${top.total_meals !== 1 ? 's' : ''}, totaling ${formatNaira(toNum(top.total_spent))}.${toNum(top.unpaid_amount) > 0 ? ` You still owe them ${formatNaira(toNum(top.unpaid_amount))}.` : ''}`,
        color: '#F59E0B',
        value: formatNaira(toNum(top.total_spent)),
      });
    }

    // 5 — Heaviest spending day of week (from 30-day trend)
    if (trend.length > 0) {
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayMap: Record<string, number> = {};
      DAYS.forEach(d => { dayMap[d] = 0; });
      trend.forEach(t => {
        const day = DAYS[new Date(t.date + 'T00:00:00').getDay()];
        dayMap[day] = (dayMap[day] ?? 0) + toNum(t.total);
      });
      const [topDay, topAmt] = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0] ?? [];
      if (topDay && topAmt > 0) {
        result.push({
          icon: Clock,
          title: 'Heaviest Day',
          message: `${topDay}s are your biggest food spending day — ${formatNaira(topAmt)} over the last 30 days.`,
          color: '#C8102E',
          value: topDay,
        });
      }
    }

    // 6 — Spend trend: compare first 15 days vs last 15 days of trend window
    if (trend.length >= 14) {
      const half = Math.floor(trend.length / 2);
      const firstHalf  = trend.slice(0, half).reduce((s, t) => s + toNum(t.total), 0);
      const secondHalf = trend.slice(half).reduce((s, t) => s + toNum(t.total), 0);
      if (firstHalf > 0 && secondHalf > 0) {
        const pct = ((secondHalf - firstHalf) / firstHalf) * 100;
        if (Math.abs(pct) > 10) {
          const rising = pct > 0;
          result.push({
            icon: rising ? TrendingUp : TrendingDown,
            title: rising ? 'Spending Rising' : 'Spending Falling',
            message: rising
              ? `Your food spending is up ${Math.abs(pct).toFixed(0)}% in the second half of this period. Watch out for overspending.`
              : `Your food spending is down ${Math.abs(pct).toFixed(0)}% in the second half of this period. Great discipline!`,
            color: rising ? '#EF4444' : '#10B981',
          });
        }
      }
    }

    // 7 — Payment track record
    if (payments.length > 0) {
      result.push({
        icon: CheckCircle,
        title: 'Payment Track Record',
        message: `You've made ${payments.length} payment batch${payments.length !== 1 ? 'es' : ''} totaling ${formatNaira(totalPaid)}. Good habit of settling your credits.`,
        color: '#10B981',
        value: formatNaira(totalPaid),
      });
    }

    // 8 — Weekly vs monthly ratio
    if (weeklyTotal > 0 && monthlyTotal > 0) {
      const ratio = (weeklyTotal / monthlyTotal) * 100;
      if (ratio > 60) {
        result.push({
          icon: Wallet,
          title: 'Heavy Week',
          message: `This week accounts for ${ratio.toFixed(0)}% of your monthly food spend — ${formatNaira(weeklyTotal)} out of ${formatNaira(monthlyTotal)}.`,
          color: '#F59E0B',
        });
      }
    }

    return result;
  }, [analytics, trend, vendors, payments]);

  // ── Loading skeleton ────────────────────────────────────────────
  if (!analytics) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 96, borderRadius: 20 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Header banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 16,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lightbulb size={16} style={{ color: '#F59E0B' }} />
        </div>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#F59E0B' }}>Smart Insights</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>
            Computed from your food vendor activity
          </p>
        </div>
      </div>

      {/* Insight cards */}
      {insights.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-10) var(--space-6)',
          color: 'var(--text-muted)', fontSize: 'var(--text-sm)',
        }}>
          Start recording meals to unlock spending insights.
        </div>
      ) : (
        insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div
              key={i}
              style={{
                background: 'var(--glass-bg-light)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
                padding: 'var(--space-4)',
                display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Accent bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: `linear-gradient(180deg, ${insight.color}, ${insight.color}60)`,
                borderRadius: '20px 0 0 20px',
              }} />

              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                background: `${insight.color}18`,
                border: `1px solid ${insight.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: insight.color,
              }}>
                <Icon size={18} strokeWidth={2} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {insight.title}
                  </p>
                  {insight.value && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700,
                      color: insight.color, flexShrink: 0,
                    }}>
                      {insight.value}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {insight.message}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

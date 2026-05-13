'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { repairsApi } from '@/lib/api/repairs';
import { PageHeader } from '@/components/shared/PageHeader';
import { RepairJobCard } from '@/components/business/RepairJobCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatNaira, formatDate } from '@/lib/format';
import { RepairJob, RepairStatus } from '@/types/api';
import { Search, Phone, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface CustomerProfile {
  name: string;
  phone?: string;
  jobs: RepairJob[];
  totalRevenue: number;
  activeJobs: number;
  lastSeen: string;
}

type SortKey = 'name' | 'revenue' | 'jobs' | 'lastSeen';

function buildProfiles(jobs: RepairJob[]): CustomerProfile[] {
  const map = new Map<string, CustomerProfile>();

  for (const job of jobs) {
    const key = job.customer_name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: job.customer_name,
        phone: job.customer_phone,
        jobs: [],
        totalRevenue: 0,
        activeJobs: 0,
        lastSeen: job.received_at,
      });
    }
    const profile = map.get(key)!;
    profile.jobs.push(job);
    profile.totalRevenue += job.total_charge;
    if (job.status !== 'delivered') profile.activeJobs++;
    if (new Date(job.received_at) > new Date(profile.lastSeen)) {
      profile.lastSeen = job.received_at;
    }
    if (job.customer_phone && !profile.phone) {
      profile.phone = job.customer_phone;
    }
  }

  return Array.from(map.values());
}

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['repairs-all-for-customers'],
    queryFn: () => repairsApi.list({ size: 500 }),
    staleTime: 60_000,
  });

  const profiles = useMemo(() => {
    const allJobs = data?.items ?? [];
    return buildProfiles(allJobs);
  }, [data]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const list = q
      ? profiles.filter(
          (p) => p.name.toLowerCase().includes(q) || p.phone?.includes(q)
        )
      : profiles;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'revenue') cmp = a.totalRevenue - b.totalRevenue;
      else if (sortKey === 'jobs') cmp = a.jobs.length - b.jobs.length;
      else cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
      return sortAsc ? cmp : -cmp;
    });
  }, [profiles, debouncedSearch, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : null;

  if (isLoading) return <CustomersSkeleton />;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${profiles.length} unique customer${profiles.length !== 1 ? 's' : ''} from repair history`}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[
          { label: 'Total Customers', value: String(profiles.length) },
          { label: 'Total Revenue', value: formatNaira(profiles.reduce((s, p) => s + p.totalRevenue, 0)) },
          { label: 'Active Jobs', value: String(profiles.reduce((s, p) => s + p.activeJobs, 0)) },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 'var(--space-4)' }}>
        <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          style={{ paddingLeft: 'calc(var(--space-3) + 14px + var(--space-2))' }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="No customers found"
          description={search ? 'Try a different search term.' : 'Customers will appear here once repair jobs are created.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Table header */}
          <div className="customers-header" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 120px 130px 110px 40px',
            gap: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-4)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          }}>
            {([
              { k: 'name' as SortKey, label: 'Customer', numeric: false },
              { k: 'revenue' as SortKey, label: 'Revenue', numeric: true },
              { k: 'jobs' as SortKey, label: 'Jobs', numeric: true },
              { k: 'lastSeen' as SortKey, label: 'Last Seen', numeric: false },
            ] as const).map(({ k, label, numeric }) => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                  justifyContent: numeric ? 'flex-end' : 'flex-start',
                  fontSize: 'var(--text-xs)', fontWeight: 600, color: sortKey === k ? 'var(--text-primary)' : 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {label} <SortIcon k={k} />
              </button>
            ))}
            <div />
            <div />
          </div>

          {/* Rows */}
          <div className="card" style={{ padding: 0, borderRadius: '0 0 var(--radius-md) var(--radius-md)', overflow: 'hidden' }}>
            {filtered.map((profile, idx) => {
              const key = profile.name.toLowerCase();
              const isExpanded = expandedKey === key;
              const activeCount = profile.activeJobs;
              return (
                <div key={key}>
                  <div
                    className="customers-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 120px 130px 110px 40px',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-4)',
                      borderBottom: idx < filtered.length - 1 || isExpanded ? '1px solid var(--border-subtle)' : 'none',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                  >
                    {/* Name + phone */}
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {profile.name}
                      </p>
                      {profile.phone && (
                        <a
                          href={`tel:${profile.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', textDecoration: 'none', marginTop: 2 }}
                        >
                          <Phone size={11} /> {profile.phone}
                        </a>
                      )}
                    </div>

                    {/* Revenue */}
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {formatNaira(profile.totalRevenue)}
                    </p>

                    {/* Jobs */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {profile.jobs.length}
                      </p>
                      {activeCount > 0 && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', fontWeight: 500 }}>
                          {activeCount} active
                        </p>
                      )}
                    </div>

                    {/* Last seen */}
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDate(profile.lastSeen)}
                    </p>

                    {/* Latest status */}
                    <div>
                      {profile.jobs[0] && (
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 600,
                          color: profile.jobs[0].status === 'delivered' ? 'var(--accent-green)' : 'var(--accent-primary)',
                          textTransform: 'capitalize',
                        }}>
                          {profile.jobs[0].status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {/* Expanded jobs list */}
                  {isExpanded && (
                    <div style={{ background: 'var(--bg-elevated)', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Job History — {profile.jobs.length} job{profile.jobs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ padding: 'var(--space-3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
                        {profile.jobs.map((job) => (
                          <RepairJobCard
                            key={job.id}
                            job={job}
                            variant="full"
                            onClick={(j) => router.push(`/business/repairs/${j.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Skeleton width={160} height={32} />
        <Skeleton width={280} height={16} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={80} />)}
      </div>
      <Skeleton width={420} height={40} />
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[1,2,3,4,5].map((i) => <Skeleton key={i} width="100%" height={64} />)}
      </div>
    </div>
  );
}

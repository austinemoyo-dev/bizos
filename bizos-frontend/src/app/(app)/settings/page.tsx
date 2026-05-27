'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProfileStore } from '@/lib/stores/profileStore';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { usersApi, UserRecord } from '@/lib/api/users';
import { repairsApi } from '@/lib/api/repairs';
import { inventoryApi } from '@/lib/api/inventory';
import { salesApi } from '@/lib/api/sales';
import { expensesApi } from '@/lib/api/expenses';
import { investmentsApi } from '@/lib/api/investments';
import { titheApi } from '@/lib/api/tithe';
import { settingsApi } from '@/lib/api/settings';
import { personalApi } from '@/lib/api/personal';
import { BusinessProfile } from '@/types/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { Skeleton } from '@/components/shared/Skeleton';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  Plus, Loader2, Shield, UserCheck, UserX,
  ChevronDown, Download, Database, Building2, UploadCloud, AlertTriangle
} from 'lucide-react';

const ROLES = ['super_admin', 'owner', 'accountant', 'technician', 'staff', 'viewer'] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<Role, string> = {
  super_admin: '#EF4444',
  owner: '#C8102E',
  accountant: '#8B5CF6',
  technician: '#3B82F6',
  staff: '#10B981',
  viewer: '#6B7280',
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  accountant: 'Accountant',
  technician: 'Technician',
  staff: 'Staff',
  viewer: 'Viewer',
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role as Role] ?? '#6B7280';
  const label = ROLE_LABELS[role as Role] ?? role;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, color,
      fontSize: 'var(--text-xs)', fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
      border: `1px solid ${color}30`,
      textTransform: 'capitalize',
    }}>
      <Shield size={10} /> {label}
    </span>
  );
}

const BLANK_FORM = { name: '', email: '', password: '', role: 'staff' as Role };

export default function SettingsPage() {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isOwnerOrAbove = currentUser?.role === 'super_admin' || currentUser?.role === 'owner';

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRole, setEditRole] = useState<Role>('staff');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  
  // Restore State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Business Profile State
  const { data: businessProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['businessProfile'],
    queryFn: () => settingsApi.getBusinessProfile(),
    enabled: isOwnerOrAbove,
  });
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<BusinessProfile>>({});
  const [savingProfile, setSavingProfile] = useState(false);



  const handleExport = async () => {
    setExporting(true);
    try {
      const [repairs, inventory, sales, expenses, investments, titheB, titheP, transactions, savings] = await Promise.all([
        repairsApi.list({ size: 1000 }),
        inventoryApi.list({ size: 1000 }),
        salesApi.list({ size: 1000 }),
        expensesApi.list({ size: 1000 }),
        investmentsApi.list(),
        titheApi.list({ scope: 'business', page: 1 }),
        titheApi.list({ scope: 'personal', page: 1 }),
        personalApi.transactions.list({ size: 1000 }),
        personalApi.savings.list(),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        business: {
          repairs: repairs.items,
          inventory: inventory.items,
          sales: sales.items,
          expenses: expenses.items,
          investments: Array.isArray(investments) ? investments : (investments as any).items ?? [],
          tithe: titheB.items,
        },
        personal: {
          transactions: transactions.items,
          savings,
          tithe: titheP.items,
        },
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Backup downloaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Export failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setExporting(false);
    }
  };
  
  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      await settingsApi.restoreBackup(restoreFile);
      addToast({ type: 'success', title: 'Database restored successfully' });
      setShowRestoreModal(false);
      setRestoreFile(null);
      // Force reload the whole app to clear react-query cache and refetch everything
      window.location.href = '/business/dashboard';
    } catch (err) {
      addToast({ type: 'error', title: 'Restore failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setRestoring(false);
    }
  };
  
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await settingsApi.updateBusinessProfile(profileForm);
      qc.invalidateQueries({ queryKey: ['businessProfile'] });
      addToast({ type: 'success', title: 'Business profile updated' });
      setEditingProfile(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: isOwnerOrAbove,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await usersApi.register(form);
      qc.invalidateQueries({ queryKey: ['users'] });
      addToast({ type: 'success', title: `${form.name} added as ${ROLE_LABELS[form.role]}` });
      setForm({ ...BLANK_FORM });
      setShowAdd(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: UserRecord) => {
    setEditingUser(u);
    setEditRole(u.role as Role);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await usersApi.update(editingUser.id, { role: editRole });
      qc.invalidateQueries({ queryKey: ['users'] });
      addToast({ type: 'success', title: 'Role updated' });
      setEditingUser(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserRecord) => {
    setTogglingId(u.id);
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      qc.invalidateQueries({ queryKey: ['users'] });
      addToast({ type: 'success', title: u.is_active ? 'User deactivated' : 'User reactivated' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err instanceof Error ? err.message : '' });
    } finally {
      setTogglingId(null);
    }
  };

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { avatarUrl, setAvatar, clearAvatar } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Upload failed', message: 'Image must be under 2 MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        addToast({ type: 'success', title: 'Profile updated', message: 'Profile photo updated' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage business profile, team, and data"
        actions={
          isSuperAdmin ? (
            <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ gap: 'var(--space-2)' }}>
              <Plus size={15} /> Add User
            </button>
          ) : undefined
        }
      />

      {/* Current user profile */}
      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <p className="section-label" style={{ marginBottom: 'var(--space-4)' }}>My Profile</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          {/* Avatar + upload button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserAvatar size={72} style={{ boxShadow: '0 4px 16px rgba(139,0,24,0.35)' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent-primary)', color: '#fff',
                border: '2px solid var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentUser?.name}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
              {currentUser?.email}
            </p>
            <RoleBadge role={currentUser?.role ?? 'viewer'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '5px 14px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </button>
            {avatarUrl && (
              <button
                className="btn-danger"
                style={{ fontSize: 'var(--text-xs)', padding: '5px 14px' }}
                onClick={() => { clearAvatar(); addToast({ type: 'success', title: 'Photo removed', message: 'Profile photo removed' }); }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Business Profile */}
      {isOwnerOrAbove && (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Business Profile</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Details displayed on invoices and reports</p>
              </div>
            </div>
            {!editingProfile && (
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setProfileForm({
                    name: businessProfile?.name ?? '',
                    address: businessProfile?.address ?? '',
                    phone: businessProfile?.phone ?? '',
                    email: businessProfile?.email ?? ''
                  });
                  setEditingProfile(true);
                }}
              >
                Edit Profile
              </button>
            )}
          </div>
          
          {loadingProfile ? (
            <Skeleton width="100%" height={100} />
          ) : editingProfile ? (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: 'var(--bg-overlay)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input className="input" value={profileForm.name || ''} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="input" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="input" type="email" value={profileForm.email || ''} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Address</label>
                  <input className="input" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn-ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)', background: 'var(--bg-overlay)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Business Name</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{businessProfile?.name || 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Phone Number</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{businessProfile?.phone || 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Email Address</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{businessProfile?.email || 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>Physical Address</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{businessProfile?.address || 'Not set'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team management */}
      {!isOwnerOrAbove ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <Shield size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-3)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Team management is only available to owners and admins.
          </p>
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={72} />)}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Team Members
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {users?.length ?? 0} account{(users?.length ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {(users ?? []).map((u, idx) => {
              const isSelf = u.id === currentUser?.id;
              const isLast = idx === (users?.length ?? 0) - 1;
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                    opacity: u.is_active ? 1 : 0.5,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: u.is_active
                      ? `linear-gradient(135deg, ${ROLE_COLORS[u.role as Role] ?? '#888'}, ${ROLE_COLORS[u.role as Role] ?? '#888'}88)`
                      : 'var(--bg-overlay)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: u.is_active ? '#fff' : 'var(--text-muted)',
                    fontSize: 'var(--text-sm)', fontWeight: 800,
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name}
                      </p>
                      {isSelf && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>(you)</span>
                      )}
                      {!u.is_active && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-red)', fontWeight: 600 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{u.email}</p>
                  </div>

                  {/* Role badge */}
                  <RoleBadge role={u.role} />

                  {/* Actions — super_admin only, not self */}
                  {isSuperAdmin && !isSelf && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', gap: 4 }}
                        onClick={() => openEdit(u)}
                      >
                        <ChevronDown size={12} /> Role
                      </button>
                      <button
                        className="btn-ghost"
                        style={{
                          fontSize: 'var(--text-xs)', padding: '4px 10px', gap: 4,
                          color: u.is_active ? 'var(--accent-red)' : 'var(--accent-green)',
                        }}
                        onClick={() => handleToggleActive(u)}
                        disabled={togglingId === u.id}
                      >
                        {togglingId === u.id
                          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : u.is_active ? <UserX size={12} /> : <UserCheck size={12} />
                        }
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Role legend */}
          <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
            <p className="section-label">Role Hierarchy</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ROLES.map((role) => (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <RoleBadge role={role} />
                  {role !== 'viewer' && <span style={{ color: 'var(--border-default)' }}>›</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
              {[
                { role: 'super_admin', desc: 'Full access, manage users' },
                { role: 'owner', desc: 'Full access, view all reports' },
                { role: 'accountant', desc: 'Finance, expenses, reports' },
                { role: 'technician', desc: 'Repairs and inventory' },
                { role: 'staff', desc: 'Basic operations' },
                { role: 'viewer', desc: 'Read-only access' },
              ].map(({ role, desc }) => (
                <div key={role} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span style={{ color: ROLE_COLORS[role as Role], fontWeight: 600, textTransform: 'capitalize' }}>
                    {ROLE_LABELS[role as Role]}
                  </span>
                  {' — '}{desc}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Data backup & Restore */}
      <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={18} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Data Management
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Export all business and personal records, or restore from a previous backup
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {isSuperAdmin && (
              <button
                className="btn-ghost"
                onClick={() => setShowRestoreModal(true)}
                style={{ gap: 'var(--space-2)' }}
              >
                <UploadCloud size={14} /> Restore
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleExport}
              disabled={exporting}
              style={{ gap: 'var(--space-2)' }}
            >
              {exporting
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Download size={14} />
              }
              {exporting ? 'Exporting…' : 'Download Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Restore Database Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => { setShowRestoreModal(false); setRestoreFile(null); }}
        title="Restore Database"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowRestoreModal(false)} disabled={restoring}>Cancel</button>
            <button 
              className="btn-primary" 
              style={{ background: 'var(--accent-red)', border: 'none' }} 
              onClick={handleRestore} 
              disabled={restoring || !restoreFile}
            >
              {restoring ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm Restore'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: 'var(--space-3)'
          }}>
            <AlertTriangle size={24} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-red)', marginBottom: 4 }}>DANGER: Destructive Action</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Restoring a backup will <strong>completely wipe</strong> the current database and replace it with the uploaded file. 
                Any data created since the backup was taken will be permanently lost. This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Upload Backup JSON File</label>
            <input 
              type="file" 
              accept="application/json" 
              className="input" 
              onChange={e => setRestoreFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </Modal>

      {/* Add User modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setFormError(''); setForm({ ...BLANK_FORM }); }}
        title="Add Team Member"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" form="add-user-form" type="submit" disabled={creating} style={{ gap: 'var(--space-2)' }}>
              {creating && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Create Account
            </button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Jane Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="jane@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password *</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required placeholder="Min 8 characters" minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.filter((r) => r !== 'super_admin').map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          {formError && <p className="form-error">{formError}</p>}
        </form>
      </Modal>

      {/* Edit role modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Change Role — ${editingUser?.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveRole} disabled={saving || editRole === editingUser?.role} style={{ gap: 'var(--space-2)' }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Save Role
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {ROLES.filter((r) => r !== 'super_admin').map((r) => (
            <label
              key={r}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${editRole === r ? ROLE_COLORS[r] : 'var(--border-subtle)'}`,
                background: editRole === r ? `${ROLE_COLORS[r]}10` : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={editRole === r}
                onChange={() => setEditRole(r)}
                style={{ accentColor: ROLE_COLORS[r] }}
              />
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: editRole === r ? ROLE_COLORS[r] : 'var(--text-primary)' }}>
                  {ROLE_LABELS[r]}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}

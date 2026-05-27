'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProfileStore } from '@/lib/stores/profileStore';

interface UserAvatarProps {
  size?: number;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}

export function UserAvatar({ size = 36, borderRadius = '50%', style }: UserAvatarProps) {
  const { user } = useAuthStore();
  const { avatarUrl, loadFromStorage } = useProfileStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const initial  = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  const gradient = 'linear-gradient(135deg, #8B0018, #5C000F)';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={user?.name ?? 'Profile'}
        style={{
          width: size, height: size,
          borderRadius,
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius,
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff',
      fontSize: size * 0.32,
      fontWeight: 800,
      letterSpacing: '0.02em',
      flexShrink: 0,
      ...style,
    }}>
      {initial}
    </div>
  );
}

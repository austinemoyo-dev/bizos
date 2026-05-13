import { api } from './client';
import { BusinessProfile, MonthlyGoal } from '@/types/api';

export const settingsApi = {
  getBusinessProfile: () => api.get<BusinessProfile>('/settings/business-profile'),
  
  updateBusinessProfile: (data: Partial<BusinessProfile>) => 
    api.put<BusinessProfile>('/settings/business-profile', data),
    
  restoreBackup: async (file: File) => {
    // Requires a custom fetch call since our api client sends JSON
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('access_token');
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
    
    const res = await fetch(`${API_BASE}/settings/restore`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to restore backup');
    }
    
    return res.json();
  }
};

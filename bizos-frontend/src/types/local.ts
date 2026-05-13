// Local Dexie types (mirror api types with offline fields)
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface WithSyncStatus {
  _syncStatus?: SyncStatus;
  _localId?: string;
}

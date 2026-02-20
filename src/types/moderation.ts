export type ContestationStatus = 'pending' | 'resolved_cancelled' | 'resolved_dismissed';
export type ReportStatus = 'pending' | 'resolved_warned' | 'resolved_suspended' | 'resolved_banned' | 'resolved_dismissed';

export interface PlacementSnapshotEntry {
  participant_id: string;
  user_id: string;
  placement: number;
  team_id: number | null;
  elo_before: number;
  elo_after: number;
  elo_change: number;
}

export interface MatchContestation {
  id: string;
  match_id: string;
  user_id: string;
  reason: string;
  status: ContestationStatus;
  admin_note: string | null;
  placements_snapshot: PlacementSnapshotEntry[] | null;
  created_at: string;
  resolved_at: string | null;
  // Joins
  match?: {
    id: string;
    join_code: string;
    status: string;
    game_id: string;
    match_type: string;
    is_draw: boolean;
    started_at: string | null;
    completed_at: string | null;
    game?: { name: string; name_fr: string | null; image_url: string | null } | null;
  } | null;
  contestant?: { username: string | null } | null;
}

export interface PlayerReport {
  id: string;
  reported_user_id: string;
  reporter_id: string;
  reason: string;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  // Joins
  reported_user?: { username: string | null } | null;
  reporter?: { username: string | null } | null;
}

export interface ModerationFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const CONTESTATION_STATUS_CONFIG: Record<ContestationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  resolved_cancelled: { label: 'Match annulé', variant: 'destructive' },
  resolved_dismissed: { label: 'Rejetée', variant: 'outline' },
};

export const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  resolved_warned: { label: 'Averti', variant: 'secondary' },
  resolved_suspended: { label: 'Suspendu', variant: 'destructive' },
  resolved_banned: { label: 'Banni', variant: 'destructive' },
  resolved_dismissed: { label: 'Rejeté', variant: 'outline' },
};

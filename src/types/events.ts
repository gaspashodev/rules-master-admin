export type EventParticipantStatus = 'inscrit' | 'confirme' | 'annule' | 'invite';

export interface Event {
  id: string;
  organiser_id: string;
  game_id: string | null;
  title: string;
  city: string | null;
  starts_at: string;
  is_competitive: boolean;
  status: string;
  spots_available: number | null;
  max_players: number | null;
  created_at: string;
  // Joined relations
  organiser?: {
    id: string;
    username: string | null;
  } | null;
  game?: {
    bgg_id: number;
    name: string;
    name_fr: string | null;
    image_url: string | null;
  } | null;
  participants_count?: number;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: EventParticipantStatus;
  profile?: {
    username: string | null;
  } | null;
}

export interface EventsFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface EventMessage {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    username: string | null;
  } | null;
}

export const PARTICIPANT_STATUS_CONFIG: Record<EventParticipantStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  inscrit: { label: 'Inscrit', variant: 'default' },
  confirme: { label: 'Confirmé', variant: 'success' },
  annule: { label: 'Annulé', variant: 'destructive' },
  invite: { label: 'Invité', variant: 'warning' },
};

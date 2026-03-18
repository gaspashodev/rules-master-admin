import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { UserProfile, UsersFilters, UserContributions, UserAchievement } from '@/types/users';

// ============ USERS LIST ============

export function useUsers(filters?: UsersFilters) {
  const search = filters?.search || '';
  const sortBy = filters?.sortBy || 'date';
  const sortDir = filters?.sortDir || 'desc';
  const ascending = sortDir === 'asc';

  return useQuery({
    queryKey: ['users', 'list', { search, sortBy, sortDir }],
    queryFn: async (): Promise<UserProfile[]> => {
      const isSearching = search.length >= 2;

      // For contribution/donation sorts: query top_contributors directly
      if (!isSearching && (sortBy === 'contributions' || sortBy === 'dons')) {
        const orderCol = sortBy === 'dons' ? 'donations_pts' : 'score';
        const { data, error } = await supabase
          .from('top_contributors')
          .select('user_id, username, avatar_url, is_certified, score, donations_pts')
          .order(orderCol, { ascending })
          .limit(20);
        if (error) throw error;
        return ((data || []).map((r: Record<string, unknown>) => ({ ...r, id: r.user_id }))) as unknown as UserProfile[];
      }

      // Otherwise query profiles directly
      const orderMap: Record<string, string> = {
        date: 'created_at',
        fiabilite: 'reliability_score',
        contributions: 'created_at',
        dons: 'created_at',
      };

      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, role, reliability_score, is_banned, is_certified, created_at')
        .order(orderMap[sortBy] || 'created_at', { ascending })
        .limit(20);

      if (isSearching) {
        query = query.ilike('username', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as UserProfile[]) || [];
    },
    enabled: search.length === 0 || search.length >= 2,
  });
}

// ============ SINGLE USER PROFILE ============

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'profile', userId],
    queryFn: async (): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role, reliability_score, is_banned, is_certified, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as unknown as UserProfile;
    },
    enabled: !!userId,
  });
}

// ============ USER CONTRIBUTIONS ============

export function useUserContributions(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'contributions', userId],
    queryFn: async (): Promise<UserContributions | null> => {
      const { data, error } = await supabase
        .from('top_contributors')
        .select('events_organized, events_participated, quizzes_created, matches_played, polls_answered, monthly_logins, donations_pts, score')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as UserContributions | null;
    },
    enabled: !!userId,
  });
}

// ============ USER ACHIEVEMENTS ============

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'achievements', userId],
    queryFn: async (): Promise<UserAchievement[]> => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id, achievement_type, tier')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data as unknown as UserAchievement[]) || [];
    },
    enabled: !!userId,
  });
}

export function useGrantAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      achievementType,
      tier,
    }: {
      userId: string;
      achievementType: string;
      tier: number;
    }): Promise<void> => {
      const { error } = await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_type: achievementType, tier });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'achievements', variables.userId] });
      toast.success('Succès attribué au joueur');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ ADMIN NOTIFICATION HELPER ============

export async function sendAdminNotification(recipientId: string, content: string) {
  if (!content.trim()) return;
  const { error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: null, recipient_id: recipientId, content: content.trim() });
  if (error) console.error('Failed to send admin notification:', error);
}

// ============ ADMIN MESSAGES ============

export interface AdminMessage {
  id: string;
  content: string;
  created_at: string;
}

export function useAdminMessages(userId: string) {
  return useQuery({
    queryKey: ['users', 'admin-messages', userId],
    queryFn: async (): Promise<AdminMessage[]> => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, content, created_at')
        .eq('recipient_id', userId)
        .is('sender_id', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown as AdminMessage[]) || [];
    },
  });
}

// ============ SEND DIRECT MESSAGE ============

export function useSendDirectMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientId,
      content,
    }: {
      recipientId: string;
      content: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: null,
          recipient_id: recipientId,
          content,
        });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'admin-messages', variables.recipientId] });
      toast.success('Message envoyé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ UPDATE RELIABILITY SCORE ============

export function useUpdateReliabilityScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      newScore,
      message,
    }: {
      userId: string;
      newScore: number;
      message?: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ reliability_score: Math.max(0, Math.min(100, newScore)) })
        .eq('id', userId);
      if (error) throw error;
      if (message) await sendAdminNotification(userId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Score de fiabilité mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ CERTIFY / UNCERTIFY ============

export function useToggleCertified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, certified }: { userId: string; certified: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_certified: certified })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Certification mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ BAN / UNBAN ============

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message?: string }): Promise<void> => {
      if (message) await sendAdminNotification(userId, message);
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur banni');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message?: string }): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('id', userId);
      if (error) throw error;
      if (message) await sendAdminNotification(userId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur débanni');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

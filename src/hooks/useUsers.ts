import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { UserProfile, UsersFilters } from '@/types/users';

// ============ USERS LIST ============

export function useUsers(filters?: UsersFilters) {
  const search = filters?.search || '';

  return useQuery({
    queryKey: ['users', 'list', { search }],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, reliability_score, is_banned, created_at')
        .ilike('username', `%${search}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as unknown as UserProfile[]) || [];
    },
    enabled: search.length >= 2,
  });
}

// ============ SINGLE USER PROFILE ============

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'profile', userId],
    queryFn: async (): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, reliability_score, is_banned, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as unknown as UserProfile;
    },
    enabled: !!userId,
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

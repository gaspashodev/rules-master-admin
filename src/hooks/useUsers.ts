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
        .select('id, username, email, role, reliability_score, is_banned, created_at')
        .or(`username.ilike.%${search}%,email.ilike.%${search}%`)
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
        .select('id, username, email, role, reliability_score, is_banned, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as unknown as UserProfile;
    },
    enabled: !!userId,
  });
}

// ============ SEND DIRECT MESSAGE ============

export function useSendDirectMessage() {
  return useMutation({
    mutationFn: async ({
      senderId,
      receiverId,
      content,
    }: {
      senderId: string;
      receiverId: string;
      content: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          type: 'system',
        });
      if (error) throw error;
    },
    onSuccess: () => {
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
    }: {
      userId: string;
      newScore: number;
    }): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ reliability_score: Math.max(0, Math.min(100, newScore)) })
        .eq('id', userId);
      if (error) throw error;
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
    mutationFn: async (userId: string): Promise<void> => {
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
    mutationFn: async (userId: string): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('id', userId);
      if (error) throw error;
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

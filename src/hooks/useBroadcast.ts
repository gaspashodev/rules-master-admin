import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { BroadcastMessage, BroadcastFormData } from '@/types/broadcast';

const QUERY_KEY = ['broadcasts'];

// ============ QUERIES ============

export function useBroadcasts() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'list'],
    queryFn: async (): Promise<BroadcastMessage[]> => {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as BroadcastMessage[];
    },
  });
}

// ============ MUTATIONS ============

export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BroadcastFormData): Promise<void> => {
      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          content: data.content.trim(),
          image_url: data.image_url || null,
          link: data.link.trim() || null,
          send_push: data.send_push,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Message diffusé à tous les joueurs');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Message supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

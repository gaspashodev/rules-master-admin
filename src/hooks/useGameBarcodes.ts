import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { GameBarcode, GameBarcodeFormData } from '@/types/database';
import { toast } from 'sonner';

export function useGameBarcodes(gameId: string | undefined) {
  return useQuery({
    queryKey: ['game-barcodes', gameId],
    queryFn: async (): Promise<GameBarcode[]> => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from('game_barcodes')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gameId,
  });
}

export function useCreateGameBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: GameBarcodeFormData }): Promise<GameBarcode> => {
      const { data: barcode, error } = await supabase
        .from('game_barcodes')
        .insert([{ game_id: gameId, ...data }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce code-barre est déjà associé à un jeu');
        }
        throw error;
      }
      return barcode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-barcodes', data.game_id] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Code-barre ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateGameBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; gameId: string; data: Partial<GameBarcodeFormData> }): Promise<GameBarcode> => {
      const { data: barcode, error } = await supabase
        .from('game_barcodes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce code-barre est déjà associé à un jeu');
        }
        throw error;
      }
      return barcode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-barcodes', data.game_id] });
      toast.success('Code-barre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteGameBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; gameId: string }): Promise<void> => {
      const { error } = await supabase
        .from('game_barcodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['game-barcodes', params.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Code-barre supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useGameByBarcode(barcode: string | undefined) {
  return useQuery({
    queryKey: ['game-by-barcode', barcode],
    queryFn: async () => {
      if (!barcode) return null;

      const { data, error } = await supabase
        .from('game_barcodes')
        .select(`
          *,
          games (*)
        `)
        .eq('barcode', barcode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: !!barcode && barcode.length >= 8,
  });
}
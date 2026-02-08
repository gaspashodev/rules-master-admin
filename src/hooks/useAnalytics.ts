import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  ErrorReport,
  ReportStatus
} from '@/types/database';
import { toast } from 'sonner';

// ============ ERROR REPORTS ============

export function useErrorReports(status?: ReportStatus) {
  return useQuery({
    queryKey: ['error-reports', 'list', status],
    queryFn: async (): Promise<ErrorReport[]> => {
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

// Stats séparées pour avoir les totaux même quand la liste est filtrée
export function useErrorReportsStats() {
  return useQuery({
    queryKey: ['error-reports', 'stats'],
    queryFn: async (): Promise<{ status: ReportStatus; report_type: string }[]> => {
      const { data, error } = await supabase
        .from('error_reports')
        .select('status, report_type');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }): Promise<void> => {
      const { data, error } = await supabase
        .from('error_reports')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Mise à jour échouée - vérifiez les permissions');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteErrorReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      toast.success('Signalement supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

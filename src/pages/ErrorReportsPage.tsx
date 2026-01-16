import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useErrorReports,
  useErrorReportsStats,
  useUpdateReportStatus,
  useDeleteErrorReport,
} from '@/hooks/useAnalytics';
import type { ReportStatus, ErrorReport } from '@/types/database';
import { 
  Trash2,
  Image as ImageIcon,
  Bug,
  Layout,
  FileText,
  MessageSquareWarning,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Smartphone,
} from 'lucide-react';

const reportTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  content: { label: 'Contenu', icon: FileText, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  ui: { label: 'Interface', icon: Layout, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  functionality: { label: 'Fonctionnalité', icon: Bug, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
};

const statusConfig: Record<ReportStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'En attente', icon: Clock, variant: 'destructive' },
  reviewed: { label: 'Examiné', icon: Eye, variant: 'secondary' },
  fixed: { label: 'Corrigé', icon: CheckCircle, variant: 'default' },
  dismissed: { label: 'Rejeté', icon: XCircle, variant: 'outline' },
};

export default function ErrorReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  
  // Liste filtrée pour l'affichage
  const { data: reports, isLoading } = useErrorReports(
    statusFilter === 'all' ? undefined : statusFilter
  );
  // Stats sur tous les reports (non filtrés)
  const { data: allReports } = useErrorReportsStats();
  
  const updateStatus = useUpdateReportStatus();
  const deleteReport = useDeleteErrorReport();

  // Stats par statut (sur tous les reports)
  const pendingCount = allReports?.filter(r => r.status === 'pending').length || 0;
  const reviewedCount = allReports?.filter(r => r.status === 'reviewed').length || 0;
  const fixedCount = allReports?.filter(r => r.status === 'fixed').length || 0;
  const dismissedCount = allReports?.filter(r => r.status === 'dismissed').length || 0;

  // Stats par type (sur tous les reports)
  const contentCount = allReports?.filter(r => r.report_type === 'content').length || 0;
  const uiCount = allReports?.filter(r => r.report_type === 'ui').length || 0;
  const functionalityCount = allReports?.filter(r => r.report_type === 'functionality').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquareWarning className="h-8 w-8" />
          Signalements
        </h1>
        <p className="text-muted-foreground">
          Erreurs et problèmes signalés par les utilisateurs de l'application
        </p>
      </div>

      {/* Stats par statut */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={statusFilter === 'pending' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => setStatusFilter('pending')}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'reviewed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Examinés</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reviewedCount}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => setStatusFilter('reviewed')}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'fixed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corrigés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fixedCount}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => setStatusFilter('fixed')}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'dismissed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetés</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{dismissedCount}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => setStatusFilter('dismissed')}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats par type - compact */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Par type :</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
          <FileText className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-blue-700 dark:text-blue-400">{contentCount}</span>
          <span className="text-blue-600/70 dark:text-blue-400/70">contenu</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
          <Layout className="h-3.5 w-3.5 text-purple-600" />
          <span className="font-medium text-purple-700 dark:text-purple-400">{uiCount}</span>
          <span className="text-purple-600/70 dark:text-purple-400/70">interface</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-900/30">
          <Bug className="h-3.5 w-3.5 text-red-600" />
          <span className="font-medium text-red-700 dark:text-red-400">{functionalityCount}</span>
          <span className="text-red-600/70 dark:text-red-400/70">fonctionnalité</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrer:</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ReportStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les signalements</SelectItem>
              <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
              <SelectItem value="reviewed">Examinés ({reviewedCount})</SelectItem>
              <SelectItem value="fixed">Corrigés ({fixedCount})</SelectItem>
              <SelectItem value="dismissed">Rejetés ({dismissedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Effacer le filtre
          </Button>
        )}
      </div>

      {/* Liste des signalements */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {reports?.length === 0 && (
                <p className="text-muted-foreground text-center py-12">
                  Aucun signalement {statusFilter !== 'all' && `avec le statut "${statusConfig[statusFilter as ReportStatus]?.label}"`}
                </p>
              )}
              {reports?.map((report) => {
                const typeInfo = reportTypeLabels[report.report_type] || reportTypeLabels.content;
                const statusInfo = statusConfig[report.status];
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={report.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </div>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Contexte */}
                        <div className="text-sm mb-2">
                          <span className="font-semibold">{report.game_name}</span>
                          {report.concept_name && (
                            <span className="text-muted-foreground">
                              {' → '}{report.concept_name}
                              {report.section_index !== null && (
                                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                                  carte {report.section_index + 1}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground">
                          {report.description}
                        </p>

                        {/* Device info */}
                        {report.device_info && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Smartphone className="h-3 w-3" />
                            <span className="font-medium">
                              {report.device_info.deviceName}
                            </span>
                            <span className="capitalize">
                              {report.device_info.platform === 'ios' ? 'iOS' : 'Android'} {report.device_info.osVersion}
                            </span>
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              v{report.device_info.appVersion}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {report.screenshot_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            title="Voir la capture d'écran"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Select
                          value={report.status}
                          onValueChange={(v) => updateStatus.mutate({ id: report.id, status: v as ReportStatus })}
                        >
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="reviewed">Examiné</SelectItem>
                            <SelectItem value="fixed">Corrigé</SelectItem>
                            <SelectItem value="dismissed">Rejeté</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive h-9 w-9">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce signalement ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteReport.mutate(report.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal screenshot */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Capture d'écran</DialogTitle>
          </DialogHeader>
          {selectedReport?.screenshot_url && (
            <div className="flex justify-center">
              <img
                src={selectedReport.screenshot_url}
                alt="Screenshot du signalement"
                className="max-h-[70vh] rounded-lg border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

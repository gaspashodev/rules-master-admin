import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Bug, Lightbulb, HelpCircle, ExternalLink, User, ChevronDown } from 'lucide-react';
import { useFeedbackReports, useMarkFeedbackProcessed } from '@/hooks/useFeedback';
import type { FeedbackType, FeedbackStatus, FeedbackFilters } from '@/hooks/useFeedback';

const PAGE_SIZE = 25;

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: typeof Bug; className: string }> = {
  bug: { label: 'Bug', icon: Bug, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  suggestion: { label: 'Suggestion', icon: Lightbulb, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  autre: { label: 'Autre', icon: HelpCircle, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; className: string }> = {
  nouveau: { label: 'Nouveau', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  en_cours: { label: 'En cours', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolu: { label: 'Résolu', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ignore: { label: 'Ignoré', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

const NEXT_STATUSES: Record<FeedbackStatus, { label: string; value: FeedbackStatus }[]> = {
  nouveau: [
    { label: 'Marquer en cours', value: 'en_cours' },
    { label: 'Marquer résolu', value: 'resolu' },
    { label: 'Ignorer', value: 'ignore' },
  ],
  en_cours: [
    { label: 'Marquer résolu', value: 'resolu' },
    { label: 'Ignorer', value: 'ignore' },
    { label: 'Remettre en nouveau', value: 'nouveau' },
  ],
  resolu: [
    { label: 'Remettre en nouveau', value: 'nouveau' },
    { label: 'Ignorer', value: 'ignore' },
  ],
  ignore: [
    { label: 'Remettre en nouveau', value: 'nouveau' },
  ],
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function FeedbackPage() {
  const [filters, setFilters] = useState<FeedbackFilters>({
    type: 'all',
    status: 'all',
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const { data: result, isLoading } = useFeedbackReports(filters);
  const markProcessed = useMarkFeedbackProcessed();

  const feedbacks = result?.data || [];
  const totalCount = result?.count || 0;
  const page = filters.page ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const setPage = (p: number) => setFilters(f => ({ ...f, page: p }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <MessageSquare className="h-7 w-7" />
            Feedbacks Alpha
          </h1>
          <p className="text-muted-foreground">
            {totalCount} retour{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={filters.type ?? 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, type: v as FeedbackType | 'all', page: 0 }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="suggestion">Suggestions</SelectItem>
              <SelectItem value="autre">Autres</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, status: v as FeedbackStatus | 'all', page: 0 }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nouveau">Nouveaux</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="resolu">Résolus</SelectItem>
              <SelectItem value="ignore">Ignorés</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun feedback à afficher.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const cfg = TYPE_CONFIG[fb.type];
            const Icon = cfg.icon;
            const statusCfg = STATUS_CONFIG[fb.status];
            const nextStatuses = NEXT_STATUSES[fb.status];

            return (
              <Card key={fb.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cfg.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm leading-relaxed">{fb.message}</p>

                      {fb.page_url && (
                        <a
                          href={fb.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {fb.page_url}
                        </a>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {fb.username ?? 'Anonyme'}
                        </span>
                        <span>·</span>
                        <span>{formatDate(fb.created_at)}</span>
                        <span>·</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-1.5 text-xs"
                          disabled={markProcessed.isPending}
                        >
                          Statut
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {nextStatuses.map((s) => (
                          <DropdownMenuItem
                            key={s.value}
                            onClick={() => markProcessed.mutate({ id: fb.id, status: s.value })}
                          >
                            {s.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

import { useState } from 'react';
import { CalendarDays, Search, Eye, Crown, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { useEvents, useEventParticipants } from '@/hooks/useEvents';
import { PARTICIPANT_STATUS_CONFIG } from '@/types/events';
import type { Event } from '@/types/events';

const PAGE_SIZE = 50;

export function EventsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data, isLoading } = useEvents({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: participants } = useEventParticipants(selectedEvent?.id);

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <CalendarDays className="h-7 w-7" />
          Événements
        </h1>
        <p className="text-muted-foreground">{data?.count || 0} événements</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (titre, ville)..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Du</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Au</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des événements</CardTitle>
        </CardHeader>
        <CardContent>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          <div className="space-y-2 mt-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : !data?.data?.length ? (
              <p className="text-muted-foreground text-center py-8">Aucun événement trouvé</p>
            ) : (
              data.data.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.game?.image_url && (
                    <img
                      src={event.game.image_url}
                      alt=""
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{event.title}</p>
                      {event.is_competitive && (
                        <Badge variant="warning" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Compétitif
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                      {event.organiser?.username && <span>{event.organiser.username}</span>}
                      {event.city && <span>{event.city}</span>}
                      <span>{new Date(event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {event.game && <span>{event.game.name_fr || event.game.name}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.participants_count || 0}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Organisateur</Label>
                  <p className="font-medium">{selectedEvent.organiser?.username || 'Inconnu'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ville</Label>
                  <p className="font-medium">{selectedEvent.city || 'Non spécifié'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {new Date(selectedEvent.starts_at).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <p className="font-medium">{selectedEvent.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jeu</Label>
                  <p className="font-medium">{selectedEvent.game ? (selectedEvent.game.name_fr || selectedEvent.game.name) : 'Aucun'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Places</Label>
                  <p className="font-medium">
                    {selectedEvent.spots_available !== null && selectedEvent.max_players
                      ? `${selectedEvent.max_players - selectedEvent.spots_available} / ${selectedEvent.max_players}`
                      : 'Non limité'}
                  </p>
                </div>
              </div>

              {selectedEvent.is_competitive && (
                <Badge variant="warning" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Événement compétitif (La Couronne)
                </Badge>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Participants ({participants?.length || 0})</h3>
                {!participants?.length ? (
                  <p className="text-muted-foreground text-sm">Aucun participant</p>
                ) : (
                  <div className="space-y-1">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded border">
                        <span className="text-sm">{p.profile?.username || 'Utilisateur inconnu'}</span>
                        <Badge variant={PARTICIPANT_STATUS_CONFIG[p.status]?.variant || 'outline'}>
                          {PARTICIPANT_STATUS_CONFIG[p.status]?.label || p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

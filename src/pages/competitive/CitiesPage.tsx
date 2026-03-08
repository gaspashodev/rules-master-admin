import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { useCities, useToggleCityActive } from '@/hooks/useCitiesSeasons';

const PAGE_SIZE = 50;

export function CitiesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: citiesData, isLoading } = useCities({ search: debouncedSearch, page, pageSize: PAGE_SIZE });
  const toggleActive = useToggleCityActive();

  const cities = citiesData?.data;
  const totalPages = Math.ceil((citiesData?.count || 0) / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MapPin className="h-7 w-7" />
          Villes
        </h1>
        <p className="text-muted-foreground">Gestion des villes compétitives ({citiesData?.count || 0})</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Villes enregistrées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ville..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {isLoading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !cities?.length ? (
            <p className="text-muted-foreground text-center py-8">Aucune ville trouvée</p>
          ) : (
            <div className="space-y-2 mt-4">
              {cities.map(city => (
                <div key={city.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <p className="font-medium">{city.name}</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Forcer active</Label>
                    <Switch
                      checked={city.force_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ cityId: city.id, forceActive: checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useScanAnalytics,
  useMissingGamesDemand,
} from '@/hooks/useAnalytics';
import { 
  BarChart3, 
  AlertTriangle, 
  Users, 
  Scan, 
  Calendar, 
  ExternalLink,
} from 'lucide-react';

// ============ SCAN ANALYTICS TAB ============

function ScanAnalyticsTab() {
  const { data: scans, isLoading } = useScanAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const totalScans = scans?.reduce((sum, s) => sum + s.scan_count, 0) || 0;
  const totalUniqueUsers = scans?.reduce((sum, s) => sum + s.unique_users, 0) || 0;
  const gamesFound = scans?.filter(s => s.game_exists).length || 0;
  const gamesNotFound = scans?.filter(s => !s.game_exists).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total scans</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs uniques</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUniqueUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jeux trouvés</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{gamesFound}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jeux manquants</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{gamesNotFound}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des scans */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des scans par code-barre</CardTitle>
          <CardDescription>Tous les codes-barres scannés triés par popularité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scans?.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Aucun scan enregistré</p>
            )}
            {scans?.map((scan) => (
              <div
                key={scan.barcode}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {scan.barcode}
                  </div>
                  {scan.game_exists ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      {scan.game_name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      Jeu non trouvé
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Scan className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{scan.scan_count}</span> scans
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{scan.unique_users}</span> users
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(scan.last_scanned).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ MISSING GAMES TAB ============

function MissingGamesTab() {
  const { data: missingGames, isLoading } = useMissingGamesDemand();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Jeux demandés (non disponibles)
          </CardTitle>
          <CardDescription>
            Codes-barres scannés mais non trouvés dans la base. Ces jeux sont demandés par les utilisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {missingGames?.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucun jeu manquant demandé
              </p>
            )}
            {missingGames?.map((game) => (
              <div
                key={game.barcode}
                className="flex items-center justify-between p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm bg-white dark:bg-background px-2 py-1 rounded border">
                    {game.barcode}
                  </div>
                  <a
                    href={`https://www.google.com/search?q=${game.barcode}+board+game`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Rechercher <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400">
                    <span className="font-bold">{game.request_count}</span> demandes
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{game.unique_users}</span> users
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dernier: {new Date(game.last_requested).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statistiques</h1>
        <p className="text-muted-foreground">
          Analyse des scans et demandes utilisateurs
        </p>
      </div>

      <Tabs defaultValue="scans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scans" className="gap-2">
            <Scan className="h-4 w-4" />
            Scans
          </TabsTrigger>
          <TabsTrigger value="missing" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Jeux manquants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scans">
          <ScanAnalyticsTab />
        </TabsContent>

        <TabsContent value="missing">
          <MissingGamesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GamesListPage } from './pages/GamesListPage';
import { GameFormPage } from './pages/GameFormPage';
import { ConceptFormPage } from './pages/ConceptFormPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ErrorReportsPage from './pages/ErrorReportsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/games" element={<GamesListPage />} />
          <Route path="/games/new" element={<GameFormPage />} />
          <Route path="/games/:id" element={<GameFormPage />} />
          <Route path="/concepts/:id" element={<ConceptFormPage />} />
          <Route path="/concepts" element={<PlaceholderPage title="Concepts" />} />
          <Route path="/quizzes" element={<PlaceholderPage title="Quiz" />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ErrorReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Accédez à cette section depuis la page d'un jeu
        </p>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="font-semibold mb-2">Base de données</h2>
          <p className="text-sm text-muted-foreground mb-4">Connecté à Supabase</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {import.meta.env.VITE_SUPABASE_URL || 'Non configuré'}
          </code>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="font-semibold mb-2">Thème</h2>
          <p className="text-sm text-muted-foreground">
            Utilisez le bouton dans le header pour changer de thème
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
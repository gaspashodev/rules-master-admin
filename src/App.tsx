import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FlaggedQuestionsPage } from './pages/quiz/FlaggedQuestionsPage';
import { BggQuestionsPage } from './pages/quiz/BggQuestionsPage';
import { BggQuestionFormPage } from './pages/quiz/BggQuestionFormPage';
import { AwardsPage } from './pages/quiz/AwardsPage';
import { BggGamesPage } from './pages/quiz/BggGamesPage';
import { EventsPage } from './pages/events/EventsPage';
import { CompetitiveMatchesPage } from './pages/competitive/CompetitiveMatchesPage';
import { CitiesSeasonsPage } from './pages/competitive/CitiesSeasonsPage';

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
          <Route path="/settings" element={<SettingsPage />} />
          {/* Quiz BGG routes */}
          <Route path="/quiz/games" element={<BggGamesPage />} />
          <Route path="/quiz/flagged" element={<FlaggedQuestionsPage />} />
          <Route path="/quiz/questions" element={<BggQuestionsPage />} />
          <Route path="/quiz/questions/new" element={<BggQuestionFormPage />} />
          <Route path="/quiz/questions/:id" element={<BggQuestionFormPage />} />
          <Route path="/quiz/awards" element={<AwardsPage />} />
          {/* Events routes */}
          <Route path="/events" element={<EventsPage />} />
          {/* Competitive routes */}
          <Route path="/competitive/matches" element={<CompetitiveMatchesPage />} />
          <Route path="/competitive/cities-seasons" element={<CitiesSeasonsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
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
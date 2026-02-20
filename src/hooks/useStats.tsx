import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalBggGames: number;
  totalQuizQuestions: number;
  activeQuizQuestions: number;
  totalAwards: number;
  totalEvents: number;
  totalCompetitiveMatches: number;
  activeCompetitiveMatches: number;
  completedCompetitiveMatches: number;
  activePlayers: number;
}

export function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [bggGames, quizQuestions, awards, events, matches, participants] = await Promise.all([
        supabase.from('bgg_games_cache').select('*', { count: 'exact', head: true }),
        supabase.from('bgg_quiz_questions').select('id, is_active'),
        supabase.from('bgg_awards').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('competitive_matches').select('status'),
        supabase.from('competitive_match_participants').select('user_id'),
      ]);

      const matchesData = matches.data || [];
      const uniquePlayers = new Set((participants.data || []).map(p => p.user_id));

      return {
        totalBggGames: bggGames.count || 0,
        totalQuizQuestions: quizQuestions.data?.length || 0,
        activeQuizQuestions: quizQuestions.data?.filter(q => q.is_active).length || 0,
        totalAwards: awards.count || 0,
        totalEvents: events.count || 0,
        totalCompetitiveMatches: matchesData.length,
        activeCompetitiveMatches: matchesData.filter(m => m.status === 'in_progress').length,
        completedCompetitiveMatches: matchesData.filter(m => m.status === 'completed').length,
        activePlayers: uniquePlayers.size,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============ DASHBOARD CHARTS ============

export interface ActivityDataPoint {
  label: string;
  events: number;
  matches: number;
}

export interface CityDataPoint {
  city: string;
  count: number;
}

export interface StatusDataPoint {
  status: string;
  count: number;
}

export interface DashboardChartData {
  eventDates: string[];
  matchDates: string[];
  eventsByCity: CityDataPoint[];
  matchesByCity: CityDataPoint[];
  matchesByStatus: StatusDataPoint[];
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async (): Promise<DashboardChartData> => {
      const [eventsResult, matchesResult, citiesResult] = await Promise.all([
        supabase.from('events').select('starts_at, city'),
        supabase.from('competitive_matches').select('created_at, status, city_id'),
        supabase.from('cities').select('id, name'),
      ]);

      const eventsData = eventsResult.data || [];
      const matchesData = matchesResult.data || [];
      const citiesData = citiesResult.data || [];

      // Build city lookup map
      const cityLookup = new Map<string, string>();
      citiesData.forEach(c => cityLookup.set(c.id, c.name));

      // Raw dates for client-side grouping
      const eventDates = eventsData
        .map((e: { starts_at?: string | null }) => e.starts_at)
        .filter((d): d is string => !!d);
      const matchDates = matchesData
        .map((m: { created_at?: string | null }) => m.created_at)
        .filter((d): d is string => !!d);

      // Events by city (top 10)
      const eventCityMap = new Map<string, number>();
      eventsData.forEach((e: { city?: string | null }) => {
        if (!e.city) return;
        eventCityMap.set(e.city, (eventCityMap.get(e.city) || 0) + 1);
      });
      const eventsByCity = Array.from(eventCityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Matches by city using city_id lookup (top 10)
      const matchCityMap = new Map<string, number>();
      matchesData.forEach((m: { city_id?: string | null }) => {
        if (!m.city_id) return;
        const cityName = cityLookup.get(m.city_id);
        if (!cityName) return;
        matchCityMap.set(cityName, (matchCityMap.get(cityName) || 0) + 1);
      });
      const matchesByCity = Array.from(matchCityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Matches by status
      const statusMap = new Map<string, number>();
      matchesData.forEach((m: { status?: string }) => {
        const status = m.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      const matchesByStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      return { eventDates, matchDates, eventsByCity, matchesByCity, matchesByStatus };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============ ACTIVITY GROUPING HELPERS ============

export type ActivityRange = '30d' | '3m' | '12m' | 'all';

export function buildActivityData(
  eventDates: string[],
  matchDates: string[],
  range: ActivityRange,
): ActivityDataPoint[] {
  if (range === '30d') {
    return buildDailyData(eventDates, matchDates, 30);
  }

  const monthCount = range === '3m' ? 3 : range === '12m' ? 12 : 0;
  return buildMonthlyData(eventDates, matchDates, monthCount);
}

function buildDailyData(eventDates: string[], matchDates: string[], days: number): ActivityDataPoint[] {
  const now = new Date();
  const points: ActivityDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    points.push({ label: key, events: 0, matches: 0 });
  }

  const pointMap = new Map(points.map(p => [p.label, p]));

  eventDates.forEach(date => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const point = pointMap.get(key);
    if (point) point.events++;
  });

  matchDates.forEach(date => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const point = pointMap.get(key);
    if (point) point.matches++;
  });

  return points;
}

function buildMonthlyData(eventDates: string[], matchDates: string[], monthCount: number): ActivityDataPoint[] {
  // Count per month
  const eventMap = new Map<string, number>();
  eventDates.forEach(date => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    eventMap.set(key, (eventMap.get(key) || 0) + 1);
  });

  const matchMap = new Map<string, number>();
  matchDates.forEach(date => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    matchMap.set(key, (matchMap.get(key) || 0) + 1);
  });

  // Build month list
  if (monthCount > 0) {
    // Fixed window: last N months
    const now = new Date();
    const points: ActivityDataPoint[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      points.push({
        label: key,
        events: eventMap.get(key) || 0,
        matches: matchMap.get(key) || 0,
      });
    }
    return points;
  }

  // All time: from earliest date to now
  const allKeys = new Set([...eventMap.keys(), ...matchMap.keys()]);
  if (allKeys.size === 0) return [];

  const sorted = Array.from(allKeys).sort();
  const start = sorted[0];
  const now = new Date();
  const endKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const points: ActivityDataPoint[] = [];
  const [startYear, startMonth] = start.split('-').map(Number);
  let y = startYear;
  let m = startMonth;

  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    points.push({
      label: key,
      events: eventMap.get(key) || 0,
      matches: matchMap.get(key) || 0,
    });
    if (key === endKey) break;
    m++;
    if (m > 12) { m = 1; y++; }
    if (points.length > 120) break; // safety
  }

  return points;
}

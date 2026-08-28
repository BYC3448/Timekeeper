import TodayPage from './today/TodayPage.svelte';
import CalendarPage from './calendar/CalendarPage.svelte';

export type AppRoute = 'today' | 'calendar';

export const ROUTES = {
  TODAY: 'today' as AppRoute,
  CALENDAR: 'calendar' as AppRoute,
} as const;

export { TodayPage, CalendarPage };

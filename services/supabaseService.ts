
import { CalendarEvent, AttendanceReport } from '../types';

const EVENTS_KEY = 'edusync_events_v2';
const REPORTS_KEY = 'edusync_reports_v2';

// 2026年度 休講日リスト
const HOLIDAYS_2026 = [
  // 2月
  '2026-02-22', '2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28',
  // 3月
  '2026-03-29', '2026-03-30', '2026-03-31',
  // 4月
  '2026-04-29', '2026-04-30',
  // 5月 GW
  '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  // 8月 全休
  ...Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`),
  // 11月
  '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04',
  '2026-11-22', '2026-11-23', '2026-11-24',
  // 12月
  '2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
  '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  // 1月
  '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04',
];

const isHoliday = (date: string) => HOLIDAYS_2026.includes(date);

const getDatesForDayOfWeek = (dayOfWeek: number, weeksCount: number = 52) => {
  const dates: string[] = [];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  let current = new Date(start);
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }

  for (let i = 0; i < weeksCount; i++) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }
  return dates;
};

const generateInitialEvents = (): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  
  getDatesForDayOfWeek(1).forEach((date, idx) => {
    if (isHoliday(date)) return;
    events.push({ id: `mon-1-${idx}`, title: "探究スターター", start_at: `${date}T16:00:00`, end_at: `${date}T17:00:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `mon-2-${idx}`, title: "探究ベーシック", start_at: `${date}T18:00:00`, end_at: `${date}T19:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(2).forEach((date, idx) => {
    if (isHoliday(date)) return;
    events.push({ id: `tue-1-${idx}`, title: "探究アドバンス", start_at: `${date}T17:00:00`, end_at: `${date}T18:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `tue-2-${idx}`, title: "探究リミットレス", start_at: `${date}T19:00:00`, end_at: `${date}T20:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(3).forEach((date, idx) => {
    if (isHoliday(date)) return;
    events.push({ id: `wed-1-${idx}`, title: "個別", start_at: `${date}T16:00:00`, end_at: `${date}T17:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `wed-2-${idx}`, title: "個別", start_at: `${date}T19:00:00`, end_at: `${date}T20:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(4).forEach((date, idx) => {
    if (isHoliday(date)) return;
    events.push({ id: `thu-1-${idx}`, title: "個別", start_at: `${date}T16:00:00`, end_at: `${date}T17:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `thu-2-${idx}`, title: "個別", start_at: `${date}T18:00:00`, end_at: `${date}T18:50:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(6).forEach((date, idx) => {
    if (isHoliday(date)) return;
    events.push({
      id: `sat-1-${idx}`,
      title: "探究ベーシック",
      start_at: `${date}T10:00:00`,
      end_at: `${date}T12:10:00`,
      event_type: "class",
      is_cancelled: false,
    });
  });

  return events;
};

export const supabaseService = {
  fetchEvents: async (): Promise<CalendarEvent[]> => {
    const stored = localStorage.getItem(EVENTS_KEY);
    if (stored) return JSON.parse(stored);
    const initial = generateInitialEvents();
    localStorage.setItem(EVENTS_KEY, JSON.stringify(initial));
    return initial;
  },

  saveEvent: async (event: CalendarEvent): Promise<CalendarEvent[]> => {
    const events = await supabaseService.fetchEvents();
    const updated = [...events, event];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
    return updated;
  },

  deleteEvent: async (id: string): Promise<CalendarEvent[]> => {
    const events = await supabaseService.fetchEvents();
    const updated = events.filter(e => e.id !== id);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
    return updated;
  },

  fetchReports: async (): Promise<AttendanceReport[]> => {
    const stored = localStorage.getItem(REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  submitAttendanceReport: async (report: AttendanceReport): Promise<boolean> => {
    const reports = await supabaseService.fetchReports();
    const newReport = { ...report, id: Date.now().toString() };
    localStorage.setItem(REPORTS_KEY, JSON.stringify([newReport, ...reports]));
    return true;
  }
};

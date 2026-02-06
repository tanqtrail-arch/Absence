
import { CalendarEvent, AttendanceReport, InterviewBooking, InterviewSlot } from '../types';

const EVENTS_KEY = 'edusync_events_v3';
const REPORTS_KEY = 'edusync_reports_v2';
const BOOKINGS_KEY = 'edusync_interview_bookings_v2';
const SLOTS_KEY = 'edusync_interview_slots_v1';

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
    events.push({ id: `mon-1-${idx}`, title: "探究スターター", start_at: `${date}T16:00:00`, end_at: `${date}T17:00:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `mon-2-${idx}`, title: "探究ベーシック", start_at: `${date}T18:00:00`, end_at: `${date}T19:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(2).forEach((date, idx) => {
    events.push({ id: `tue-1-${idx}`, title: "探究アドバンス", start_at: `${date}T17:00:00`, end_at: `${date}T18:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `tue-2-${idx}`, title: "探究リミットレス", start_at: `${date}T19:00:00`, end_at: `${date}T20:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(3).forEach((date, idx) => {
    events.push({ id: `wed-1-${idx}`, title: "個別", start_at: `${date}T16:00:00`, end_at: `${date}T17:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `wed-2-${idx}`, title: "個別", start_at: `${date}T19:00:00`, end_at: `${date}T20:40:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(4).forEach((date, idx) => {
    events.push({ id: `thu-1-${idx}`, title: "個別", start_at: `${date}T16:00:00`, end_at: `${date}T17:40:00`, event_type: "class", is_cancelled: false });
    events.push({ id: `thu-2-${idx}`, title: "個別", start_at: `${date}T18:00:00`, end_at: `${date}T18:50:00`, event_type: "class", is_cancelled: false });
  });

  getDatesForDayOfWeek(6).forEach((date, idx) => {
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
  },

  // --- Interview Slots (Admin) ---
  fetchInterviewSlots: async (): Promise<InterviewSlot[]> => {
    const stored = localStorage.getItem(SLOTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  toggleInterviewSlot: async (date: string, time: string): Promise<InterviewSlot[]> => {
    const slots = await supabaseService.fetchInterviewSlots();
    const existing = slots.find(s => s.date === date && s.time === time);
    let updated: InterviewSlot[];
    if (existing) {
      if (existing.is_booked) return slots;
      updated = slots.filter(s => s.id !== existing.id);
    } else {
      const newSlot: InterviewSlot = {
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        time,
        is_booked: false,
      };
      updated = [...slots, newSlot];
    }
    localStorage.setItem(SLOTS_KEY, JSON.stringify(updated));
    return updated;
  },

  // --- Interview Bookings (Parent) ---
  fetchInterviewBookings: async (): Promise<InterviewBooking[]> => {
    const stored = localStorage.getItem(BOOKINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  submitInterviewBooking: async (booking: Omit<InterviewBooking, 'id' | 'status' | 'created_at'>): Promise<InterviewBooking> => {
    const bookings = await supabaseService.fetchInterviewBookings();
    const newBooking: InterviewBooking = {
      ...booking,
      id: Date.now().toString(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([newBooking, ...bookings]));

    // Mark the slot as booked
    const slots = await supabaseService.fetchInterviewSlots();
    const slotToBook = slots.find(s => s.date === booking.preferred_date && s.time === booking.preferred_time);
    if (slotToBook) {
      const updatedSlots = slots.map(s =>
        s.id === slotToBook.id ? { ...s, is_booked: true, booking_id: newBooking.id } : s
      );
      localStorage.setItem(SLOTS_KEY, JSON.stringify(updatedSlots));
    }

    return newBooking;
  },

  cancelInterviewBooking: async (id: string): Promise<InterviewBooking[]> => {
    const bookings = await supabaseService.fetchInterviewBookings();
    const updated = bookings.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));

    // Free the slot
    const slots = await supabaseService.fetchInterviewSlots();
    const updatedSlots = slots.map(s =>
      s.booking_id === id ? { ...s, is_booked: false, booking_id: undefined } : s
    );
    localStorage.setItem(SLOTS_KEY, JSON.stringify(updatedSlots));

    return updated;
  }
};

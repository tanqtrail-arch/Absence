
export type EventType = "class" | "interview" | "event" | "exam";

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  event_type: EventType;
  is_cancelled: boolean;
  cancel_reason?: string;
  location?: string;
  description?: string;
}

export interface AttendanceReport {
  id?: string;
  calendar_event_id?: string; // Optional for full-day absence
  event_title?: string;       // Cached title for display
  absence_date?: string;      // Used when no specific event is selected
  student_id: string;
  student_name?: string;      // Name from profile or context
  reason: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  role: "student" | "teacher" | "admin";
}

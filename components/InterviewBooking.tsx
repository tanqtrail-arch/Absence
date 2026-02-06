
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabaseService } from "../services/supabaseService";
import { InterviewBooking as InterviewBookingType, InterviewSlot } from "../types";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// 11:00 ~ 21:00 in 30-min intervals
const ALL_TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const h = Math.floor(i / 2) + 11;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const TOPICS = [
  { label: "学習相談", icon: "📚" },
  { label: "進路相談", icon: "🎯" },
  { label: "コース変更", icon: "🔄" },
  { label: "体験授業", icon: "✨" },
  { label: "その他", icon: "💬" },
];

// ---------- Mini Calendar ----------
const MiniCalendar: React.FC<{
  selectedDate: string;
  onSelect: (dateStr: string) => void;
  highlightedDates: Set<string>;
  isAdmin?: boolean;
}> = ({ selectedDate, onSelect, highlightedDates, isAdmin }) => {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(dateStr);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-slate-800">{viewYear}年 {viewMonth + 1}月</span>
        <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center text-[10px] font-bold py-1 ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>{w}</div>
        ))}
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const dayNum = parseInt(dateStr.split("-")[2]);
          const dayOfWeek = new Date(dateStr).getDay();
          const isPast = !isAdmin && dateStr <= todayStr;
          const isSelected = dateStr === selectedDate;
          const hasSlots = highlightedDates.has(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? (isAdmin ? "bg-rose-500 text-white shadow-lg scale-105" : "bg-blue-500 text-white shadow-lg scale-105")
                  : isPast
                    ? "text-slate-300 cursor-not-allowed"
                    : hasSlots
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : isToday
                        ? "ring-2 ring-blue-300 text-slate-700 hover:bg-slate-50"
                        : dayOfWeek === 0
                          ? "text-rose-400 hover:bg-rose-50"
                          : dayOfWeek === 6
                            ? "text-blue-400 hover:bg-blue-50"
                            : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {dayNum}
              {hasSlots && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const InterviewBooking: React.FC<{ userName: string | null; isAdminMode: boolean }> = ({ userName, isAdminMode }) => {
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [bookings, setBookings] = useState<InterviewBookingType[]>([]);
  const [loading, setLoading] = useState(true);

  // Parent flow state
  const [step, setStep] = useState(1); // 1=date, 2=time, 3=form, 4=done
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [parentName, setParentName] = useState(userName || "");
  const [childGrowth, setChildGrowth] = useState("");
  const [consultationTopic, setConsultationTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const timeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (userName) setParentName(userName); }, [userName]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [slotData, bookingData] = await Promise.all([
        supabaseService.fetchInterviewSlots(),
        supabaseService.fetchInterviewBookings(),
      ]);
      setSlots(slotData);
      setBookings(bookingData);
    } finally {
      setLoading(false);
    }
  };

  // Dates that have at least one open slot
  const datesWithSlots = useMemo(() => {
    const set = new Set<string>();
    slots.filter(s => !s.is_booked).forEach(s => set.add(s.date));
    return set;
  }, [slots]);

  // Admin: dates with any slots
  const datesWithAnySlots = useMemo(() => {
    const set = new Set<string>();
    slots.forEach(s => set.add(s.date));
    return set;
  }, [slots]);

  // Available times for selected date (parent)
  const availableTimesForDate = useMemo(
    () => slots.filter(s => s.date === selectedDate && !s.is_booked).map(s => s.time).sort(),
    [slots, selectedDate]
  );

  // Admin: slots for selected date
  const adminSlotsForDate = useMemo(() => {
    const slotMap = new Map<string, InterviewSlot>();
    slots.filter(s => s.date === selectedDate).forEach(s => slotMap.set(s.time, s));
    return slotMap;
  }, [slots, selectedDate]);

  // ---------- Admin: Toggle Slot ----------
  const handleToggleSlot = async (time: string) => {
    const updated = await supabaseService.toggleInterviewSlot(selectedDate, time);
    setSlots(updated);
  };

  // ---------- Parent: Submit ----------
  const handleSubmit = async () => {
    if (!parentName || !consultationTopic || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      await supabaseService.submitInterviewBooking({
        parent_name: parentName,
        child_growth: childGrowth,
        consultation_topic: consultationTopic,
        message,
        preferred_date: selectedDate,
        preferred_time: selectedTime,
      });
      setStep(4);
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("この予約をキャンセルしますか？")) return;
    await supabaseService.cancelInterviewBooking(id);
    await fetchAll();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate("");
    setSelectedTime("");
    setChildGrowth("");
    setConsultationTopic("");
    setMessage("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  // ===========================
  //  ADMIN VIEW
  // ===========================
  if (isAdminMode) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 font-bold text-xs">
            <CalendarIcon size={14} /> 日付を選択 → 面談可能な時間をタップ
          </div>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            highlightedDates={datesWithAnySlots}
            isAdmin
          />
        </div>

        {/* Time Slots Grid */}
        <div className="xl:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CalendarIcon size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-bold">左のカレンダーから日付を選択</p>
              <p className="text-xs mt-1">面談可能な時間枠を設定できます</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-rose-500" />
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                  の面談枠
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" /> 受付可能</span>
                  <span className="flex items-center gap-1 text-amber-600"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" /> 予約済</span>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {ALL_TIME_SLOTS.map((time) => {
                  const slot = adminSlotsForDate.get(time);
                  const isOpen = !!slot && !slot.is_booked;
                  const isBooked = !!slot && slot.is_booked;

                  return (
                    <button
                      key={time}
                      onClick={() => handleToggleSlot(time)}
                      disabled={isBooked}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        isBooked
                          ? "bg-amber-50 text-amber-500 border-2 border-amber-200 cursor-not-allowed"
                          : isOpen
                            ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-100 shadow-sm"
                            : "bg-slate-50 text-slate-400 border-2 border-slate-100 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-center font-medium">
                タップで受付可能 / 不可を切り替え（予約済みの枠は変更できません）
              </p>
            </>
          )}

          {/* Admin: Recent Bookings */}
          {bookings.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <BookOpen size={14} className="text-rose-500" />
                予約一覧
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bookings.filter(b => b.status !== "cancelled").map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-slate-700">{b.parent_name}</span>
                      <span className="text-slate-400 ml-2">
                        {new Date(b.preferred_date + "T00:00:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} {b.preferred_time}
                      </span>
                      <span className="ml-2 text-slate-400">{b.consultation_topic}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === "confirmed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {b.status === "confirmed" ? "確定" : "確認中"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================
  //  PARENT VIEW
  // ===========================
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
      {/* Left: Step-by-step booking */}
      <div className="xl:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Step indicator */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-blue-500" />
            <h2 className="font-bold text-slate-800 text-base">面談予約</h2>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  step >= s
                    ? step === s ? "bg-blue-500 text-white shadow-md" : "bg-blue-100 text-blue-500"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                    step > s ? "bg-blue-500 text-white" : step === s ? "bg-white/30 text-white" : "bg-slate-200 text-slate-400"
                  }`}>{step > s ? "✓" : s}</span>
                  {s === 1 ? "日程" : s === 2 ? "時間" : "情報入力"}
                </div>
                {s < 3 && <ChevronRight size={12} className="text-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Date */}
          {step === 1 && (
            <div>
              <p className="text-xs text-slate-500 mb-4 font-medium">面談をご希望の日程をお選びください。<span className="text-blue-500">青い印</span>のある日は予約可能です。</p>
              <MiniCalendar
                selectedDate={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedTime("");
                }}
                highlightedDates={datesWithSlots}
              />
              {selectedDate && (
                <div className="mt-5">
                  {availableTimesForDate.length > 0 ? (
                    <button
                      onClick={() => setStep(2)}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} で次へ
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-center">
                      <p className="text-xs text-slate-400 font-medium">この日は予約可能な時間がありません</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Time (scroll-based picker) */}
          {step === 2 && (
            <div>
              <button onClick={() => { setStep(1); setSelectedTime(""); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-bold mb-3 transition-colors">
                <ArrowLeft size={14} /> 日程を変更
              </button>
              <p className="text-xs text-slate-500 mb-1 font-medium">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
              </p>
              <p className="text-xs text-slate-400 mb-4">ご希望の時間をスクロールしてお選びください。</p>

              {/* Scrollable time picker */}
              <div
                ref={timeScrollRef}
                className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth scrollbar-hide"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {availableTimesForDate.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`snap-center flex-shrink-0 w-20 py-4 rounded-2xl text-sm font-bold transition-all ${
                      selectedTime === time
                        ? "bg-blue-500 text-white shadow-lg scale-105"
                        : "bg-slate-50 text-slate-600 border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <Clock size={14} className={`mx-auto mb-1 ${selectedTime === time ? "text-white" : "text-slate-400"}`} />
                    {time}
                  </button>
                ))}
              </div>

              {selectedTime && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full mt-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {selectedTime} で次へ
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}

          {/* Step 3: Form */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-bold mb-3 transition-colors">
                <ArrowLeft size={14} /> 時間を変更
              </button>

              <div className="mb-5 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                <CalendarIcon size={16} className="text-blue-500 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-blue-700">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                  </span>
                  <span className="font-bold text-blue-500 ml-2">{selectedTime}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <User size={12} /> 保護者名 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="山田 太郎"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={12} /> お子さまに感じた成長
                  </label>
                  <textarea
                    value={childGrowth}
                    onChange={(e) => setChildGrowth(e.target.value)}
                    rows={3}
                    placeholder="最近、自分から宿題に取り組むようになりました。探究の授業で発表が上手になった気がします。"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <BookOpen size={12} /> 相談内容 <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t.label}
                        onClick={() => setConsultationTopic(t.label)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          consultationTopic === t.label
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <span className="mr-1">{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={12} /> その他伝えたいこと
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="任意：事前に伝えておきたいことがあれば"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !parentName || !consultationTopic}
                  className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> 送信中...</>
                  ) : (
                    <><Send size={16} /> 予約を申し込む</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">予約を受け付けました</h3>
              <p className="text-xs text-slate-500 mb-2">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })} {selectedTime}
              </p>
              <p className="text-xs text-slate-400 mb-6">確認後、ご連絡いたします。</p>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                別の予約をする
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: My bookings */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <CalendarIcon size={16} className="text-blue-500" />
            予約一覧
          </h3>

          {bookings.length === 0 ? (
            <p className="text-slate-400 text-xs italic text-center py-8 font-medium">
              予約はまだありません
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-4 rounded-xl border transition-all ${
                    booking.status === "cancelled"
                      ? "border-slate-100 bg-slate-50 opacity-60"
                      : "border-slate-200 bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs">{booking.consultation_topic}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      booking.status === "confirmed"
                        ? "text-emerald-600 bg-emerald-50"
                        : booking.status === "cancelled"
                          ? "text-slate-400 bg-slate-100"
                          : "text-amber-600 bg-amber-50"
                    }`}>
                      {booking.status === "confirmed" ? <><CheckCircle2 size={10} />確定</> :
                       booking.status === "cancelled" ? <><XCircle size={10} />キャンセル</> :
                       <><AlertCircle size={10} />確認中</>}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon size={10} />
                      {new Date(booking.preferred_date + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock size={10} />
                      {booking.preferred_time}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={10} />
                      {booking.parent_name}
                    </p>
                    {booking.child_growth && (
                      <p className="flex items-start gap-1.5 mt-1">
                        <Sparkles size={10} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{booking.child_growth}</span>
                      </p>
                    )}
                  </div>
                  {booking.status === "pending" && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="mt-3 w-full py-2 text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle size={12} />
                      キャンセル
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewBooking;

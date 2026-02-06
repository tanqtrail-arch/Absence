
import React, { useState, useEffect } from "react";
import { supabaseService } from "../services/supabaseService";
import { InterviewBooking as InterviewBookingType } from "../types";
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  BookOpen,
} from "lucide-react";

const TOPICS = [
  "学習相談",
  "進路相談",
  "コース変更相談",
  "体験授業の相談",
  "その他",
];

const TIME_SLOTS = [
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
];

const InterviewBooking: React.FC<{ userName: string | null }> = ({ userName }) => {
  const [bookings, setBookings] = useState<InterviewBookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [studentName, setStudentName] = useState(userName || "");
  const [studentContact, setStudentContact] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (userName) setStudentName(userName);
  }, [userName]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await supabaseService.fetchInterviewBookings();
      setBookings(data);
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentContact || !preferredDate || !preferredTime || !topic) return;

    setSubmitting(true);
    try {
      await supabaseService.submitInterviewBooking({
        student_name: studentName,
        student_contact: studentContact,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        topic,
        message,
      });
      setSuccess(true);
      setStudentContact("");
      setPreferredDate("");
      setPreferredTime("");
      setTopic("");
      setMessage("");
      await fetchBookings();
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("この予約をキャンセルしますか？")) return;
    const updated = await supabaseService.cancelInterviewBooking(id);
    setBookings(updated);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} />確定</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><XCircle size={10} />キャンセル</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertCircle size={10} />確認中</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
      {/* Booking Form */}
      <div className="xl:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-500" />
          面談予約
        </h2>
        <p className="text-xs text-slate-400 mb-6">ご希望の日時を選択して面談を予約してください。</p>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-bold text-emerald-800 text-sm">予約を受け付けました</p>
              <p className="text-emerald-600 text-xs mt-0.5">確認後、ご連絡いたします。</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> お名前 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} /> 連絡先（電話 or メール） <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studentContact}
                onChange={(e) => setStudentContact(e.target.value)}
                placeholder="090-1234-5678 / example@mail.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <CalendarIcon size={12} /> 希望日 <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                min={getMinDate()}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Clock size={12} /> 希望時間 <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="">時間を選択</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <BookOpen size={12} /> 相談内容 <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">相談内容を選択</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <MessageSquare size={12} /> メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="事前に伝えておきたいことがあれば入力してください"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> 送信中...</>
            ) : (
              <><Send size={16} /> 予約を送信</>
            )}
          </button>
        </form>
      </div>

      {/* Bookings List */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <CalendarIcon size={16} className="text-blue-500" />
            予約一覧
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : bookings.length === 0 ? (
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
                    <div>
                      <span className="font-bold text-slate-800 text-xs">{booking.topic}</span>
                      <div className="ml-2 inline-block">{statusLabel(booking.status)}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon size={10} />
                      {new Date(booking.preferred_date).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock size={10} />
                      {booking.preferred_time}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={10} />
                      {booking.student_name}
                    </p>
                    {booking.message && (
                      <p className="flex items-start gap-1.5 mt-1">
                        <MessageSquare size={10} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{booking.message}</span>
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

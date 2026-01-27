
import React, { useState, useEffect, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabaseService } from "./services/supabaseService";
import { CalendarEvent, AttendanceReport } from "./types";
import AbsenceModal from "./components/AbsenceModal";
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  BookOpen, 
  AlertTriangle,
  Loader2,
  MessageCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Trash2
} from "lucide-react";

declare const liff: any;

type ViewType = 'calendar' | 'dashboard';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('calendar');
  const [events, setEvents] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      if (typeof liff !== 'undefined') {
        try {
          await liff.init({ liffId: "YOUR_LIFF_ID_HERE" }); 
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setUserName(profile.displayName);
          }
        } catch (error) {
          console.error('LIFF initialization failed', error);
        }
      }
    };
    initLiff();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventData, reportData] = await Promise.all([
        supabaseService.fetchEvents(),
        supabaseService.fetchReports()
      ]);
      setRawEvents(eventData);
      setReports(reportData);
      updateCalendarEvents(eventData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCalendarEvents = (eventData: CalendarEvent[]) => {
    const formattedEvents = eventData.map((event: CalendarEvent) => {
      let bgColor = "#3b82f6"; 
      if (event.is_cancelled) bgColor = "#94a3b8"; 
      else if (event.event_type !== 'class') bgColor = "#8b5cf6"; 

      return {
        id: event.id,
        title: event.is_cancelled ? `【休講】${event.title}` : event.title,
        start: event.start_at,
        end: event.end_at,
        backgroundColor: bgColor,
        borderColor: bgColor,
        extendedProps: event,
        className: event.is_cancelled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 transition-opacity'
      };
    });

    setEvents(formattedEvents);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEventClick = async (info: any) => {
    const eventData = info.event.extendedProps as CalendarEvent;
    
    if (isAdminMode) {
      if (confirm(`「${eventData.title}」を削除しますか？`)) {
        const updated = await supabaseService.deleteEvent(eventData.id);
        setRawEvents(updated);
        updateCalendarEvents(updated);
      }
      return;
    }

    if (eventData.is_cancelled) {
      alert(`【休講中】${eventData.title}\n理由: ${eventData.cancel_reason || '未設定'}\n休講のため、欠席連絡は不要です。`);
      return;
    }

    setSelectedEvent(eventData);
    setSelectedDate(new Date(eventData.start_at));
    setIsAbsenceModalOpen(true);
  };

  const handleDateClick = async (info: any) => {
    if (isAdminMode) {
      const name = prompt("イベント名を入力してください", "特別講義");
      if (name) {
        const startTime = prompt("開始時間 (HH:mm)", "10:00");
        const endTime = prompt("終了時間 (HH:mm)", "12:00");
        if (startTime && endTime) {
          const newEvent: CalendarEvent = {
            id: `custom-${Date.now()}`,
            title: name,
            start_at: `${info.dateStr}T${startTime}:00`,
            end_at: `${info.dateStr}T${endTime}:00`,
            event_type: "event",
            is_cancelled: false
          };
          const updated = await supabaseService.saveEvent(newEvent);
          setRawEvents(updated);
          updateCalendarEvents(updated);
        }
      }
      return;
    }

    setSelectedEvent(null);
    setSelectedDate(info.date);
    setIsAbsenceModalOpen(true);
  };

  const handleReportSubmit = async (report: AttendanceReport) => {
    await supabaseService.submitAttendanceReport(report);
    const updatedReports = await supabaseService.fetchReports();
    setReports(updatedReports);
  };

  const todayClasses = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return rawEvents.filter(e => e.start_at.startsWith(todayStr));
  }, [rawEvents]);

  const StatusBadge: React.FC<{status: string}> = ({ status }) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100"><Clock size={10} /> 送信済</span>;
      case 'approved': return <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle size={10} /> 承認済</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100"><AlertCircle size={10} /> 差戻</span>;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200">
        <div className="p-6 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isAdminMode ? 'bg-rose-600' : 'bg-blue-600'}`}>
            <BookOpen size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">EduSync</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="ダッシュボード" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')}
          />
          <NavItem 
            icon={<CalendarIcon size={20} />} 
            label="カレンダー" 
            active={activeView === 'calendar'} 
            onClick={() => setActiveView('calendar')}
          />
        </nav>
        <div className="p-4 mx-4 mb-4 rounded-xl border border-slate-200 bg-slate-50">
          <button onClick={() => setIsAdminMode(!isAdminMode)} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${isAdminMode ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}>
            {isAdminMode ? '管理者モード終了' : '管理者モード'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto font-sans">
        <header className={`sticky top-0 z-30 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 ${isAdminMode ? 'bg-rose-50/80' : 'bg-white/80'}`}>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">
              {activeView === 'calendar' ? 'スクールカレンダー' : '欠席連絡履歴'}
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {activeView}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-[#06C755] flex items-center justify-end gap-1"><MessageCircle size={10} /> LINE連携</span>
              <p className="text-[10px] text-slate-400 font-medium">{userName || 'ログイン中'}</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {activeView === 'calendar' ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                {isAdminMode && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 font-bold text-xs">
                    <PlusCircle size={14} /> 日付をタップしてイベント追加 / イベントをタップして削除
                  </div>
                )}
                {loading ? (
                  <div className="h-[500px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale="ja"
                    events={events}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    height="auto"
                  />
                )}
                
                <div className="mt-6 flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-3 h-3 rounded bg-blue-500"></div> 授業 (欠席連絡可)
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-3 h-3 rounded bg-purple-500"></div> イベント / 特別講義
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-blue-500"/>
                    本日の授業
                  </h3>
                  <div className="space-y-3">
                    {todayClasses.length > 0 ? todayClasses.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => {
                          if (!item.is_cancelled && !isAdminMode) {
                            setSelectedEvent(item);
                            setSelectedDate(new Date(item.start_at));
                            setIsAbsenceModalOpen(true);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border-l-4 transition-all hover:translate-x-1 ${item.is_cancelled ? 'border-slate-300 bg-slate-50 opacity-60' : 'border-blue-400 bg-blue-50 hover:bg-blue-100'}`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                          {isAdminMode && <Trash2 size={12} className="text-rose-400" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(item.start_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 開始</p>
                      </button>
                    )) : <p className="text-slate-400 text-xs italic text-center py-4 font-medium">本日の予定はありません</p>}
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-lg text-white">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle size={16}/> 
                    スマート連絡
                  </h3>
                  <p className="text-[11px] opacity-90 leading-relaxed font-medium">
                    カレンダーから授業を選んで送信するだけで、AIが状況に合わせた丁寧なメッセージを生成します。LINEでの送信もスムーズに行えます。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={14} /> 欠席連絡ダッシュボード
                </h2>
                <div className="text-[10px] font-bold text-slate-400">計 {reports.length} 件</div>
              </div>

              {reports.length > 0 ? (
                reports.map((report) => (
                  <div key={report.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-200 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 flex-shrink-0">
                          <span className="text-[9px] font-black text-slate-400 leading-none">
                            {report.absence_date ? new Date(report.absence_date).getMonth() + 1 : '??'}月
                          </span>
                          <span className="text-lg font-bold text-slate-800 leading-tight">
                            {report.absence_date ? new Date(report.absence_date).getDate() : '??'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-800">{report.event_title || '終日欠席'}</h4>
                            <StatusBadge status={report.status} />
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                            <span className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{report.reason}</span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(report.created_at).toLocaleDateString()} 送信</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs italic text-slate-600 line-clamp-2 leading-relaxed">
                        "{report.message}"
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <ClipboardList size={32} />
                  </div>
                  <p className="font-bold text-slate-800">連絡履歴はまだありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {isAbsenceModalOpen && (selectedEvent || selectedDate) && (
        <AbsenceModal 
          target={{ 
            type: selectedEvent ? 'event' : 'date', 
            data: selectedEvent || selectedDate! 
          }}
          onClose={() => { setIsAbsenceModalOpen(false); setSelectedEvent(null); setSelectedDate(null); }}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${active ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
  >
    <div className="flex items-center gap-3">{icon}<span className="text-sm">{label}</span></div>
    {active && <ChevronRight size={14} className="opacity-40" />}
  </button>
);

export default App;

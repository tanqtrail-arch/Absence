
import React, { useState, useEffect } from 'react';
import { CalendarEvent, AttendanceReport } from '../types';
import { generatePoliteMessage } from '../services/geminiService';
import { Loader2, Sparkles, X, AlertCircle, CheckCircle2, Calendar, Send, Edit3 } from 'lucide-react';

interface AbsenceModalProps {
  target: {
    type: 'event' | 'date';
    data: CalendarEvent | Date;
  };
  onClose: () => void;
  onSubmit: (report: AttendanceReport) => Promise<void>;
}

declare const liff: any;

const AbsenceModal: React.FC<AbsenceModalProps> = ({ target, onClose, onSubmit }) => {
  const [profile, setProfile] = useState<{ displayName: string; userId: string } | null>(null);
  const [reason, setReason] = useState("体調不良");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInLiff, setIsInLiff] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      if (typeof liff !== 'undefined' && liff.isInClient()) {
        setIsInLiff(true);
        try {
          const p = await liff.getProfile();
          setProfile(p);
        } catch (e) {
          console.error("Failed to get profile", e);
        }
      }
    };
    initProfile();
  }, []);

  const isEvent = target.type === 'event';
  const event = isEvent ? (target.data as CalendarEvent) : null;
  const date = isEvent ? new Date((target.data as CalendarEvent).start_at) : (target.data as Date);
  const dateStr = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const createFullMessage = (msg: string) => {
    const title = event ? `【授業名】${event.title}` : `【欠席日】${dateStr} (終日)`;
    return `[欠席連絡]\n${title}\n【日付】${dateStr}\n【理由】${reason}\n\n${msg}\n\nよろしくお願いいたします。`;
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    const targetTitle = event ? event.title : "終日（全授業）";
    const aiMessage = await generatePoliteMessage(reason, targetTitle, dateStr);
    setMessage(aiMessage);
    setIsGenerating(false);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    setIsSubmitting(true);
    const finalDraft = createFullMessage(message);

    try {
      const report: AttendanceReport = {
        calendar_event_id: event?.id,
        event_title: event?.title,
        absence_date: !isEvent ? date.toISOString().split('T')[0] : undefined,
        student_id: profile?.userId || "anonymous",
        student_name: profile?.displayName || "匿名ユーザー",
        reason,
        message,
        status: "pending",
        created_at: new Date().toISOString()
      };
      await onSubmit(report);

      if (isInLiff) {
        if (liff.isApiAvailable('shareTargetPicker')) {
          await liff.shareTargetPicker([{ type: 'text', text: finalDraft }]);
        } else {
          await liff.sendMessages([{ type: 'text', text: finalDraft }]);
        }
        liff.closeWindow();
      } else {
        await navigator.clipboard.writeText(finalDraft);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Submit Error:', error);
      alert('送信処理中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-slate-900">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Edit3 size={20} />
            <h3 className="text-lg font-bold">欠席連絡フォーム</h3>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[85vh]">
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm border border-slate-200">
              {isEvent ? <AlertCircle size={20} /> : <Calendar size={20} />}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isEvent ? '対象授業' : '欠席日'}</p>
              <p className="font-bold text-slate-800 leading-none">{isEvent ? event?.title : '終日欠席'}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{dateStr}</p>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">欠席理由</label>
              <select 
                className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all font-medium bg-white text-base"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="体調不良">体調不良</option>
                <option value="学校行事">学校行事</option>
                <option value="家庭の用事">家庭の用事</option>
                <option value="公欠">公欠</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">詳細メッセージ</label>
                <button 
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="text-[10px] flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-40 shadow-sm"
                >
                  {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AIで清書
                </button>
              </div>
              <textarea
                required
                className="w-full border-2 border-slate-100 p-3 rounded-xl h-32 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none text-sm leading-relaxed"
                placeholder="理由の詳細を入力してください（AI清書も利用可能）"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                type="submit"
                disabled={isSubmitting || !message}
                className={`w-full py-4 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg ${
                  copied ? 'bg-green-500' : 'bg-[#06C755] hover:bg-[#05b34c] shadow-green-100'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : copied ? (
                  <><CheckCircle2 size={24} /> コピー完了！</>
                ) : (
                  <><Send size={24} /> LINEで送信する</>
                )}
              </button>
              
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AbsenceModal;

import React, { useEffect, useMemo, useState } from 'react';
import { getEscalations, getConversationMessages } from '../services/api';
import { AlertTriangle, Clock, MessageSquare, ArrowRight, Loader2, Bot, User } from 'lucide-react';

const Escalations = () => {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewItem, setReviewItem] = useState(null);
    const [reviewMessages, setReviewMessages] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const parseDateValue = (value) => {
        if (!value) return 0;
        const d = new Date(value);
        return isNaN(d) ? 0 : d.getTime();
    };

    const formatDateValue = (value) => {
        const d = new Date(value);
        if (!value || isNaN(d)) return 'N/A';
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const filteredEscalations = useMemo(() => {
        const filtered = escalations.filter((item) => {
            const timeVal = parseDateValue(item.created_at || item.timestamp || item.date || item.createdAt);
            const startOk = startDate ? timeVal >= parseDateValue(startDate) : true;
            const endOk = endDate ? timeVal <= parseDateValue(endDate + 'T23:59:59') : true;
            return startOk && endOk;
        });
        filtered.sort((a, b) =>
            parseDateValue(b.created_at || b.timestamp || b.date || b.createdAt) -
            parseDateValue(a.created_at || a.timestamp || a.date || a.createdAt)
        );
        return filtered;
    }, [escalations, startDate, endDate]);

    useEffect(() => {
        const fetchEscalations = async () => {
            try {
                const data = await getEscalations();
                setEscalations(data);
            } catch (error) {
                console.error("Failed to fetch escalations", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEscalations();
    }, []);

    const openReview = async (item) => {
        setReviewItem(item);
        setReviewMessages([]);
        if (!item?.conversation_id) return;
        try {
            setReviewLoading(true);
            const msgs = await getConversationMessages(item.conversation_id);
            setReviewMessages(msgs || []);
        } catch (err) {
            console.error("Failed to fetch conversation messages", err);
        } finally {
            setReviewLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Escalation Queue</h2>
                    <p className="text-slate-500 mt-1">Prioritize and resolve customer queries requiring human attention.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 font-semibold text-slate-600 text-xs uppercase tracking-wider">ID</th>
                                <th className="px-8 py-5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Query Details</th>
                                <th className="px-8 py-5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reason</th>
                                <th className="px-8 py-5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date / Time</th>
                                <th className="px-8 py-5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-blue-600" size={32} />
                                            <p className="text-sm">Loading escalations...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredEscalations.map((item) => (
                                <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="px-8 py-6 text-sm font-medium text-slate-500">#{item.id}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <MessageSquare size={18} />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-semibold text-sm max-w-md line-clamp-1">{item.query}</p>
                                                <p className="text-slate-400 text-xs mt-1">2 hours ago • via Chat</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                                            <AlertTriangle size={12} />
                                            {item.reason}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock size={12} />
                                            <span>{formatDateValue(item.created_at || item.timestamp || item.date || item.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => openReview(item)}
                                            className="group/btn flex items-center gap-2 ml-auto text-blue-600 hover:text-blue-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
                                        >
                                            Review
                                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {escalations.length === 0 && !loading && (
                    <div className="p-20 text-center">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500 mt-2">No pending escalations. Great job keeping customers happy.</p>
                    </div>
                )}
            </div>

            {reviewItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Escalation #{reviewItem.id}</h4>
                                    <p className="text-sm text-slate-500">{reviewItem.reason}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReviewItem(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-700">Conversation</p>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 text-sm max-h-[26rem] overflow-y-auto space-y-4">
                                {reviewLoading && (
                                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                                        <Loader2 size={16} className="animate-spin" />
                                        Loading messages...
                                    </div>
                                )}
                                {!reviewLoading && reviewMessages.length === 0 && (
                                    <div className="text-slate-400 text-sm">No messages found for this conversation.</div>
                                )}
                                {!reviewLoading && reviewMessages.map((msg) => (
                                    <div
                                        key={msg.message_id || `${msg.timestamp}-${msg.role}`}
                                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role !== 'user' && (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-blue-500 to-purple-600 text-white shadow-sm">
                                                <Bot size={14} />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>{msg.timestamp}</p>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-900 text-white shadow-sm">
                                                <User size={14} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setReviewItem(null)}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Escalations;

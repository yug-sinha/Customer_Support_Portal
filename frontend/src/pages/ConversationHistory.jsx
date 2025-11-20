import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent, getAgentConversations, getConversationMessages, resolveConversation, getAllConversations } from '../services/api';
import { MessageSquare, CheckCircle, Clock, AlertCircle, ArrowLeft, X, Loader2, Search, Filter, Bot } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ConversationHistory() {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadData();
    }, [agentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (agentId) {
                const [agentData, conversationsData] = await Promise.all([
                    getAgent(agentId),
                    getAgentConversations(agentId)
                ]);
                setAgent(agentData);
                setConversations(conversationsData);
            } else {
                const conversationsData = await getAllConversations();
                setConversations(conversationsData);
                setAgent(null);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            setLoadingMessages(true);
            setSelectedConversation(conversationId);
            const messagesData = await getConversationMessages(conversationId);
            setMessages(messagesData);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleResolve = async (conversationId) => {
        try {
            setResolvingId(conversationId);
            await resolveConversation(conversationId);
            await loadData(); // Reload conversations to update status

            // If the resolved conversation is currently selected, refresh its messages or state if needed
            if (selectedConversation === conversationId) {
                // Optionally refresh messages
            }
        } catch (error) {
            console.error('Error resolving conversation:', error);
        } finally {
            setResolvingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock, label: 'Active' },
            escalated: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle, label: 'Escalated' },
            closed: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle, label: 'Closed' },
            resolved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Resolved' }
        };
        const badge = badges[status] || badges.active;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="font-medium">Loading conversation history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate(agentId ? '/agent-config' : '/')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {agentId ? 'Back to Agents' : 'Back to Dashboard'}
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {agent ? `${agent.name} - ` : 'All '}Conversation History
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {conversations.length} total conversations recorded
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 md:items-center">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['all', 'active', 'escalated', 'resolved'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={clsx(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        statusFilter === status
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
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
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
                    <div className="p-4 space-y-3">
                        {conversations.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">No conversations found</p>
                            </div>
                        ) : (
                            conversations
                                .filter((conv) => statusFilter === 'all' || conv.status === statusFilter)
                                .filter((conv) => {
                                    const startOk = startDate ? new Date(conv.started_at) >= new Date(startDate) : true;
                                    const endOk = endDate ? new Date(conv.started_at) <= new Date(endDate + 'T23:59:59') : true;
                                    return startOk && endOk;
                                })
                                .map((conv) => (
                                    <div
                                        key={conv.conversation_id}
                                        onClick={() => loadMessages(conv.conversation_id)}
                                        className={clsx(
                                            "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                                            selectedConversation === conv.conversation_id
                                                ? "bg-white border-blue-500 shadow-md ring-1 ring-blue-500/10"
                                                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <Bot className="w-4 h-4" />
                                                </span>
                                                <div>
                                                    <span className="block text-sm font-bold text-slate-900">
                                                        {conv.agent_name || 'Unknown Agent'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {conv.total_messages || 0} messages
                                                    </span>
                                                </div>
                                            </div>
                                            {getStatusBadge(conv.status)}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(conv.started_at)}
                                            </div>
                                        </div>

                                        {conv.status === 'active' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleResolve(conv.conversation_id);
                                                }}
                                                disabled={resolvingId === conv.conversation_id}
                                                className="mt-3 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {resolvingId === conv.conversation_id ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Resolving...
                                                    </>
                                                ) : (
                                                    'Mark as Resolved'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedConversation ? (
                        <>
                            <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                        AI
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Conversation Details</h2>
                                        <p className="text-xs text-slate-500">ID: {selectedConversation.slice(0, 8)}...</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedConversation(null);
                                        setMessages([]);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                                {loadingMessages ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <p className="text-sm font-medium">Retrieving transcript...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No messages in this conversation</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex flex-col max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div
                                                    className={clsx(
                                                        "px-5 py-3.5 rounded-2xl text-sm shadow-sm",
                                                        msg.role === 'user'
                                                            ? "bg-blue-600 text-white rounded-br-none"
                                                            : "bg-white border border-slate-100 text-slate-700 rounded-bl-none"
                                                    )}
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                            a: ({ node, ...props }) => <a className={`underline ${msg.role === 'user' ? 'text-white' : 'text-blue-600'}`} {...props} />,
                                                            code: ({ node, ...props }) => <code className={`${msg.role === 'user' ? 'bg-blue-700' : 'bg-slate-100'} px-1 rounded text-sm font-mono`} {...props} />,
                                                            pre: ({ node, ...props }) => <pre className={`${msg.role === 'user' ? 'bg-blue-800' : 'bg-slate-800 text-white'} p-2 rounded-lg overflow-x-auto mb-2`} {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 mt-1.5 px-1">
                                                    {formatDate(msg.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Select a conversation</h3>
                            <p className="text-sm text-slate-500">Choose a conversation from the list to view the transcript</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

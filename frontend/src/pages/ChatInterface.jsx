import React, { useState, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { getAgents, sendChatMessage, resolveConversation } from '../services/api';
import { Send, Bot, User, AlertTriangle, CheckCircle, MoreVertical, Search, X } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatInterface = () => {
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [typing, setTyping] = useState(false);
    const [conversationClosed, setConversationClosed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const messagesEndRef = useRef(null);

    // Block navigation if conversation is active
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            conversationId !== null && currentLocation.pathname !== nextLocation.pathname
    );

    // Handle browser refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (conversationId !== null) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [conversationId]);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const data = await getAgents();
                setAgents(data);
                if (data.length > 0) setSelectedAgent(data[0]);
            } catch (error) {
                console.error("Failed to fetch agents", error);
            }
        };
        fetchAgents();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedAgent || conversationClosed) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        setTyping(true);

        try {
            const response = await sendChatMessage(selectedAgent.id, userMessage.content, conversationId);

            // Store conversation ID for subsequent messages
            if (response.conversation_id) {
                setConversationId(response.conversation_id);
                setConversationClosed(false);
            }

            const botMessage = {
                role: 'assistant',
                content: response.response,
                intent: response.intent,
                confidence: response.confidence_score,
                escalated: response.escalated
            };
            setMessages(prev => [...prev, botMessage]);

            // If escalated, reset conversation (it's now closed)
            if (response.escalated) {
                setConversationId(null);
                setConversationClosed(true);
            }
        } catch (error) {
            console.error("Failed to send message", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not reach agent." }]);
        } finally {
            setLoading(false);
            setTyping(false);
        }
    };

    const handleResolve = async () => {
        if (!conversationId) return;
        try {
            await resolveConversation(conversationId);
            setConversationId(null);
            setConversationClosed(true);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Conversation marked as resolved.",
                intent: "resolved",
                confidence: 1.0
            }]);
        } catch (error) {
            console.error("Failed to resolve conversation", error);
        }
    };

    const handleResolveAndLeave = async () => {
        try {
            if (conversationId) {
                await resolveConversation(conversationId);
            }
            setConversationId(null);
            if (blocker.state === "blocked") {
                blocker.proceed();
            }
        } catch (error) {
            console.error("Failed to resolve", error);
            if (blocker.state === "blocked") {
                blocker.proceed();
            }
        }
    };

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.persona.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-6rem)] flex gap-6 animate-in fade-in duration-500">
            {/* Blocking Modal */}
            {blocker.state === "blocked" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shadow-sm">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Active Conversation</h3>
                                <p className="text-slate-500 mt-1 text-sm leading-relaxed">
                                    You have an active conversation. Please mark it as resolved before leaving this page to ensure proper tracking.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => blocker.reset()}
                                    className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Stay
                                </button>
                                <button
                                    onClick={handleResolveAndLeave}
                                    className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-600/20"
                                >
                                    Resolve & Leave
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Agent Selection Sidebar */}
            <div className="w-80 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-xl text-slate-900">Agents</h3>
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search agents..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredAgents.map(agent => (
                        <button
                            key={agent.id}
                            onClick={() => {
                                if (conversationId) {
                                    if (!window.confirm("Switching agents will end the current conversation. Continue?")) return;
                                    setConversationId(null);
                                    setConversationClosed(false);
                                }
                                setSelectedAgent(agent);
                                setMessages([]);
                            }}
                            className={clsx(
                                'w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-4 group',
                                selectedAgent?.id === agent.id
                                    ? 'bg-blue-50 shadow-sm ring-1 ring-blue-100'
                                    : 'hover:bg-slate-50'
                            )}
                        >
                            <div className="relative">
                                <div className={clsx(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105",
                                    selectedAgent?.id === agent.id ? "bg-gradient-to-tr from-blue-500 to-purple-600" : "bg-slate-200"
                                )}>
                                    <Bot size={20} />
                                </div>
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className={clsx("font-bold text-sm truncate", selectedAgent?.id === agent.id ? "text-slate-900" : "text-slate-700")}>{agent.name}</p>
                                    <span className="text-[10px] text-slate-400 font-medium">12:30 PM</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{agent.persona} • Ready to help</p>
                            </div>
                        </button>
                    ))}
                    {filteredAgents.length === 0 && (
                        <div className="text-center text-sm text-slate-400 py-6">
                            No agents found.
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-4 px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{selectedAgent?.name || 'Select an Agent'}</h3>
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Active Now
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {conversationId && (
                            <button
                                onClick={handleResolve}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mr-2"
                            >
                                <CheckCircle size={14} />
                                Resolve
                            </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#f8fafc]">
                {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                <Bot size={40} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-slate-600">Start a conversation</p>
                                <p className="text-sm">Say hello to {selectedAgent?.name}</p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                'flex gap-4 max-w-3xl animate-in slide-in-from-bottom-2 duration-300',
                                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                            )}
                        >
                            <div className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm',
                                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-gradient-to-tr from-blue-500 to-purple-600 text-white'
                            )}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className="space-y-1">
                                <div className={clsx(
                                    'rounded-2xl p-4 shadow-sm text-[15px] leading-relaxed',
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                )}>
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
                                {msg.role === 'assistant' && (
                                    <div className="flex gap-2 text-[10px] font-medium text-slate-500 px-1">
                                        <span className="text-slate-400 uppercase tracking-wider">Intent: {msg.intent}</span>
                                        {msg.escalated ? (
                                            <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Escalated</span>
                                        ) : (
                                            <span className="text-green-500 flex items-center gap-1"><CheckCircle size={10} /> {Math.round(msg.confidence * 100)}% Confidence</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {typing && (
                        <div className="flex gap-3 max-w-3xl">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-blue-500 to-purple-600 text-white shadow-sm">
                                <Bot size={14} />
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white border border-slate-100 text-slate-500 text-sm shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:120ms]" />
                                <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce [animation-delay:240ms]" />
                                <span className="text-xs font-medium">Thinking…</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                    {!conversationClosed ? (
                        <>
                            <form onSubmit={handleSend} className="relative flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-2 bg-transparent border-none focus:ring-0 outline-none text-slate-700 placeholder:text-slate-400"
                                    disabled={loading || !selectedAgent}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !selectedAgent || !input.trim()}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-95"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <p className="text-center text-[10px] text-slate-400 mt-2">
                                AI can make mistakes. Please review sensitive information.
                            </p>
                        </>
                    ) : (
                        <div className="text-center text-sm text-slate-500 py-4 space-y-3">
                            <p>This conversation has been closed. Select an agent to start a new chat.</p>
                            <button
                                onClick={() => {
                                    setConversationId(null);
                                    setMessages([]);
                                    setConversationClosed(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Start New Query
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;

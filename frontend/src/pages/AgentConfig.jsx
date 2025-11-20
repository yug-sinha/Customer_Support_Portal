import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAgent, getAgents, updateAgent, deleteAgent } from '../services/api';
import { Save, Plus, Bot, Sparkles, Wrench, Zap, X, Edit2, Trash2, History, Loader2 } from 'lucide-react';
import clsx from 'clsx';


const AgentConfig = () => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showCreatePanel, setShowCreatePanel] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // For specific button loading states
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        persona: '',
        system_instructions: '',
        tools: [],
        escalation_threshold: 0.5,
    });

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const data = await getAgents();
            setAgents(data);
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            persona: '',
            system_instructions: '',
            tools: [],
            escalation_threshold: 0.5,
        });
        setEditingAgent(null);
        setShowCreatePanel(false);
    };

    const handleEdit = (agent) => {
        setEditingAgent(agent);
        setFormData({
            name: agent.name,
            persona: agent.persona,
            system_instructions: agent.system_instructions,
            tools: agent.tools,
            escalation_threshold: agent.escalation_threshold,
        });
        setShowCreatePanel(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setActionLoading(deleteTarget.id);
            await deleteAgent(deleteTarget.id);
            await fetchAgents();
        } catch (error) {
            console.error('Error deleting agent:', error);
            alert('Failed to delete agent');
        } finally {
            setActionLoading(null);
            setDeleteTarget(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingAgent) {
                await updateAgent(editingAgent.id, formData);
            } else {
                await createAgent(formData);
            }
            await fetchAgents();
            resetForm();
        } catch (error) {
            console.error('Error saving agent:', error);
            alert('Failed to save agent');
        } finally {
            setLoading(false);
        }
    };

    const handleToolChange = (tool) => {
        setFormData(prev => ({
            ...prev,
            tools: prev.tools.includes(tool)
                ? prev.tools.filter(t => t !== tool)
                : [...prev.tools, tool]
        }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3 max-w-4xl">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Agent Management</h2>
                        <p className="text-slate-500 mt-1">Configure and manage your AI support agents.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                        <strong>Note:</strong> Knowledge base access is not available and tools are dummy mocks (email, refund, etc.). Write system instructions carefully to guide the agent and decide when to escalate to a human.
                    </div>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowCreatePanel(true);
                    }}
                    className="self-start md:self-auto flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 font-semibold"
                >
                    <Plus size={20} />
                    Create New Agent
                </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {initialLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-slate-500 gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-sm">Loading agents...</p>
                    </div>
                ) : agents.map(agent => (
                    <div key={agent.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        </div>
                        <div className="p-6 -mt-10 relative">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white mb-4">
                                <Bot size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{agent.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{agent.persona}</p>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Tools Enabled</span>
                                    <span className="font-bold text-blue-600">{agent.tools.length}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Escalation Threshold</span>
                                    <span className="font-bold text-slate-900">{agent.escalation_threshold}</span>
                                </div>
                            </div>

                            {agent.tools.length > 0 && (
                                <>
                                <div className="text-xs font-semibold text-slate-600 mb-1">Tools</div>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {agent.tools.map((tool, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                                            {tool.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                        </span>
                                    ))}
                                </div>
                                </>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => navigate(`/conversations/${agent.id}`)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <History size={14} />
                                    History
                                </button>
                                <button
                                    onClick={() => handleEdit(agent)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(agent)}
                                    disabled={actionLoading === agent.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === agent.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && !initialLoading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bot size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Agents Yet</h3>
                        <p className="text-slate-500 mb-6">Create your first AI agent using the button above.</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Agent Side Panel */}
            {showCreatePanel && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Configure your AI support agent</p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-8">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
                                    <Sparkles className="text-purple-500" size={18} />
                                    <h4 className="font-bold">Identity & Persona</h4>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Agent Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g., Support Bot 1"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Persona</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g., Friendly, Professional"
                                            value={formData.persona}
                                            onChange={e => setFormData({ ...formData, persona: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">System Instructions</label>
                                        <textarea
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                                            placeholder="Define how the agent should behave..."
                                            value={formData.system_instructions}
                                            onChange={e => setFormData({ ...formData, system_instructions: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tools */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
                                    <Wrench className="text-blue-500" size={18} />
                                    <h4 className="font-bold">Capabilities & Tools</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        'check_order_status',
                                        'initiate_refund',
                                        'send_email',
                                        'create_support_ticket',
                                        'apply_discount',
                                        'get_customer_profile',
                                        'update_order_address',
                                        'notify_vendor'
                                    ].map(tool => {
                                        const isSelected = formData.tools.includes(tool);
                                        return (
                                            <label
                                                key={tool}
                                                className={clsx(
                                                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-50/50"
                                                        : "border-slate-100 bg-white hover:border-slate-200"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                    checked={isSelected}
                                                    onChange={() => handleToolChange(tool)}
                                                />
                                                <Zap size={20} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                                                <span className={clsx("font-semibold text-sm capitalize", isSelected ? "text-blue-700" : "text-slate-600")}>
                                                    {tool.replace(/_/g, ' ')}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Escalation */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
                                    <Zap className="text-amber-500" size={18} />
                                    <h4 className="font-bold">Escalation Sensitivity</h4>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-end mb-3">
                                        <label className="text-sm font-semibold text-slate-700">Confidence Threshold</label>
                                        <span className="text-xl font-bold text-blue-600">{formData.escalation_threshold}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        value={formData.escalation_threshold}
                                        onChange={e => setFormData({ ...formData, escalation_threshold: parseFloat(e.target.value) })}
                                    />
                                    <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
                                        <span>More Autonomous</span>
                                        <span>More Cautious</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold disabled:opacity-70"
                                >
                                    {loading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Save size={20} />
                                    )}
                                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <Trash2 size={18} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-bold text-slate-900">Delete Agent</h4>
                                <p className="text-sm text-slate-500">
                                    Are you sure you want to delete “{deleteTarget.name}”? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 disabled:opacity-60"
                                disabled={actionLoading === deleteTarget.id}
                            >
                                {actionLoading === deleteTarget.id ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentConfig;

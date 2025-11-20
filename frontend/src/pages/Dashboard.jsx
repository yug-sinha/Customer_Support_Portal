import React, { useEffect, useState } from 'react';
import { getMetrics, getAgents, getAgentConversations } from '../services/api';
import { BarChart, Activity, Users, AlertCircle, ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />

        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                    <Icon size={24} />
                </div>
            </div>

            <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState([]);
    const [agentStats, setAgentStats] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [metricsData, agentsData] = await Promise.all([
                    getMetrics(),
                    getAgents()
                ]);

                setMetrics(metricsData || {
                    total_queries: 0,
                    escalated_queries: 0,
                    resolved_queries: 0,
                    resolution_rate: 0
                });

                setAgents(agentsData || []);

                // Fetch per-agent stats (conversations) in parallel
                const statsEntries = await Promise.all(
                    (agentsData || []).map(async (agent) => {
                        try {
                            const conversations = await getAgentConversations(agent.id);
                            const total = conversations.length;
                            let resolved = 0;
                            let escalated = 0;

                            conversations.forEach(c => {
                                const status = (c.status || '').toString().trim().toLowerCase();
                                const ended = Boolean(c.ended_at);
                                if (status === 'escalated') {
                                    escalated += 1;
                                } else if (status === 'resolved' || status === 'closed' || status === 'done' || status === 'completed' || ended) {
                                    resolved += 1;
                                }
                            });

                            const active = Math.max(0, total - resolved - escalated);
                            return [agent.id, { total, resolved, escalated, active }];
                        } catch (err) {
                            console.error(`Failed to fetch conversations for agent ${agent.id}`, err);
                            return [agent.id, { total: 0, resolved: 0, escalated: 0, active: 0 }];
                        }
                    })
                );
                setAgentStats(Object.fromEntries(statsEntries));
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                setMetrics({
                    total_queries: 0,
                    escalated_queries: 0,
                    resolved_queries: 0,
                    resolution_rate: 0
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-slate-500 mt-1">Real-time insights into agent performance and customer satisfaction.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Queries"
                    value={metrics.total_queries.toLocaleString()}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="Resolved"
                    value={metrics.resolved_queries.toLocaleString()}
                    icon={Users}
                    color="emerald"
                />
                <StatCard
                    title="Escalated"
                    value={metrics.escalated_queries.toLocaleString()}
                    icon={AlertCircle}
                    color="rose"
                />
                <StatCard
                    title="Resolution Rate"
                    value={`${metrics.resolution_rate}%`}
                    icon={BarChart}
                    color="violet"
                />
            </div>

            {/* Agent cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Agent Performance</h3>
                    <div className="text-sm text-slate-400">Live snapshot</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => {
                        const stats = agentStats[agent.id] || { total: 0, resolved: 0, active: 0 };
                        return (
                            <div key={agent.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                                        <Bot size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Agent</p>
                                        <h4 className="text-lg font-bold text-slate-900">{agent.name}</h4>
                                        <p className="text-xs text-slate-400">{agent.persona}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">Total</p>
                                        <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3">
                                        <p className="text-xs text-emerald-600">Resolved</p>
                                        <p className="text-xl font-bold text-emerald-700">{stats.resolved}</p>
                                    </div>
                                    <div className="bg-rose-50 rounded-xl p-3">
                                        <p className="text-xs text-rose-600">Escalated</p>
                                        <p className="text-xl font-bold text-rose-700">{stats.escalated}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {agents.length === 0 && (
                        <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-500">
                            No agents found. Create one to see performance stats.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, AlertTriangle, Settings, History } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Agent Config', path: '/agent-config' },
        { icon: MessageSquare, label: 'Chat Interface', path: '/chat' },
        { icon: History, label: 'History', path: '/conversations' },
        { icon: AlertTriangle, label: 'Escalations', path: '/escalations' },
    ];

    return (
        <div className="w-72 h-screen bg-[#0f172a] text-white flex flex-col shadow-2xl font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[60%] bg-blue-600/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-[80%] h-[60%] bg-purple-600/10 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <MessageSquare size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Agentic<span className="text-blue-400">AI</span></h1>
                        <p className="text-xs text-slate-400 font-medium">Support Portal</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    'group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ease-out relative overflow-hidden',
                                    isActive
                                        ? 'bg-white/10 text-white shadow-inner border border-white/5'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                                )}
                                <Icon size={20} className={clsx("transition-colors", isActive ? "text-blue-400" : "group-hover:text-white")} />
                                <span className="font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer */}
            <div className="mt-auto p-6 relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center">
                            <span className="font-bold text-xs text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-cyan-500">AD</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">Admin User</p>
                        <p className="text-xs text-slate-400 truncate">admin@company.com</p>
                    </div>
                    <Settings size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

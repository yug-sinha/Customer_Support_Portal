import React, { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentConfig from './pages/AgentConfig';
import ChatInterface from './pages/ChatInterface';
import Escalations from './pages/Escalations';
import ConversationHistory from './pages/ConversationHistory';

const PASSWORD = 'yug@lyzr';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "agent-config", element: <AgentConfig /> },
      { path: "chat", element: <ChatInterface /> },
      { path: "escalations", element: <Escalations /> },
      { path: "conversations", element: <ConversationHistory /> },
      { path: "conversations/:agentId", element: <ConversationHistory /> },
    ]
  }
]);

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('auth_pass_ok');
    if (saved === 'true') setAuthenticated(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('auth_pass_ok', 'true');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30">
              CS
            </div>
            <h1 className="text-2xl font-bold text-white mt-3">Customer Support Portal</h1>
            <p className="text-slate-300 text-sm mt-1">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
            />
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;

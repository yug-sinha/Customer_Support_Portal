import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentConfig from './pages/AgentConfig';
import ChatInterface from './pages/ChatInterface';
import Escalations from './pages/Escalations';
import ConversationHistory from './pages/ConversationHistory';

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
  return <RouterProvider router={router} />;
}

export default App;

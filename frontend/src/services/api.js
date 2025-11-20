import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const createAgent = (agentData) => api.post('/agents/', agentData).then(res => res.data);
export const getAgents = () => api.get('/agents/').then(res => res.data);
export const getAgent = (id) => api.get(`/agents/${id}`).then(res => res.data);
export const updateAgent = (id, agentData) => api.put(`/agents/${id}`, agentData).then(res => res.data);
export const deleteAgent = (id) => api.delete(`/agents/${id}`).then(res => res.data);

export const sendChatMessage = (agentId, query, conversationId = null) =>
    api.post('/chat/', { agent_id: agentId, query, conversation_id: conversationId }).then(res => res.data);

export const getMetrics = () => api.get('/analytics/').then(res => res.data);
export const getAnalyticsOverview = () => api.get('/analytics/overview').then(res => res.data);
export const getEscalations = () => api.get('/analytics/escalations').then(res => res.data);
export const getActivity = () => api.get('/analytics/activity').then(res => res.data);

// Conversations
export const getAgentConversations = (agentId) => api.get(`/conversations/agent/${agentId}`).then(res => res.data);
export const getConversationMessages = (conversationId) => api.get(`/conversations/${conversationId}/messages`).then(res => res.data);
export const resolveConversation = (conversationId) => api.put(`/conversations/${conversationId}/resolve`).then(res => res.data);
export const getAllConversations = () => api.get('/conversations/').then(res => res.data);

export default api;

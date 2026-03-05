const BASE = import.meta.env.VITE_API_URL || '';
const KEY = import.meta.env.VITE_API_KEY || '';

const buildHeaders = () => {
  const h = { 'Content-Type': 'application/json' };
  if (KEY) h.Authorization = `Bearer ${KEY}`;
  return h;
};

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const detail = typeof payload === 'string'
      ? payload
      : payload?.detail || payload?.message || JSON.stringify(payload);
    throw new Error(`API ${res.status}: ${detail}`);
  }

  return payload;
}

export const api = {
  // Agents
  getAgents: () => request('/api/agents'),
  getAgent: (id) => request(`/api/agents/${id}`),
  getAgentCost: (id) => request(`/api/agents/${id}/cost`),
  updateAgent: (id, data) => request(`/api/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  syncAgents: () => request('/api/agents/sync', { method: 'POST' }),

  // Chat
  getChatHistory: (agentId, limit = 50) => request(`/api/chat/history?agent_id=${agentId}&limit=${limit}`),
  sendMessage: (agentId, message) => request('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, message }),
  }),
  clearChat: (agentId) => request(`/api/chat/history?agent_id=${agentId}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/api/projects'),
  getProject: (id) => request(`/api/projects/${id}`),
  createProject: (data) => request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateProject: (id, data) => request(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  restartProject: (id) => request(`/api/projects/${id}/restart`, { method: 'POST' }),
  getProjectLogs: (id) => request(`/api/projects/${id}/logs`),

  // Spend
  getSpendSummary: () => request('/api/spend/summary'),
  getSpendDaily: (days = 30) => request(`/api/spend/daily?days=${days}`),
  getSpendByProvider: () => request('/api/spend/by-provider'),
  getSpendByProject: () => request('/api/spend/by-project'),
  pollSpend: () => request('/api/spend/poll', { method: 'POST' }),

  // Health
  healthCheck: () => fetch(`${BASE}/api/health`).then(r => r.json()),
};

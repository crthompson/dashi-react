import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import AgentCard from '../components/AgentCard';

export default function Agents() {
  const { data: agents, loading, error, refresh } = usePolling(api.getAgents, 60000);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setEditForm({ ...agent });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAgent(editingAgent.id, editForm);
      setEditingAgent(null);
      refresh();
      showMessage('Agent updated successfully');
    } catch (err) {
      console.error('Failed to update agent:', err);
      showMessage('Failed to update agent', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (agentId) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      await api.updateAgent(agentId, { ...agent, is_default: true });
      refresh();
      showMessage(`${agent.name} is now the default agent`);
    } catch (err) {
      console.error('Failed to set default:', err);
      showMessage('Failed to set default agent', 'error');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncAgents();
      refresh();
      showMessage(result.message || 'Sync completed');
    } catch (err) {
      console.error('Failed to sync:', err);
      showMessage('Failed to sync agents', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSkillsChange = (value) => {
    const skills = value.split(',').map(s => s.trim()).filter(Boolean);
    setEditForm({ ...editForm, assigned_skills: skills });
  };

  if (loading && !agents) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 text-dashi-muted">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        Loading agents...
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-dashi-danger">Error: {error}</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="page-title">Agents</h2>
            <p className="page-subtitle">Manage your AI agents</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync from OpenClaw
            </>
          )}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${
          message.type === 'error' 
            ? 'bg-dashi-danger/10 text-dashi-danger border border-dashi-danger/20' 
            : 'bg-dashi-success/10 text-dashi-success border border-dashi-success/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Edit Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-dashi-border">
              <h3 className="text-xl font-bold text-white">Edit Agent</h3>
              <p className="text-dashi-muted text-sm mt-1">{editingAgent.name}</p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-dashi-muted mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-dashi-muted mb-2">Model</label>
                <span className="inline-block px-3 py-1.5 bg-dashi-primary/10 text-dashi-primary rounded-lg text-sm font-medium">
                  {editForm.model || 'Unknown'}
                </span>
              </div>

              {/* Workspace */}
              <div>
                <label className="block text-sm font-medium text-dashi-muted mb-2">Workspace</label>
                <input
                  type="text"
                  value={editForm.workspace || ''}
                  onChange={(e) => setEditForm({ ...editForm, workspace: e.target.value })}
                  placeholder="/path/to/workspace"
                  className="input-field"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dashi-muted mb-2">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="What does this agent do?"
                  className="input-field resize-none"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-dashi-muted mb-2">
                  Assigned Skills <span className="text-dashi-muted/50 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={(editForm.assigned_skills || []).join(', ')}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="skill1, skill2, skill3"
                  className="input-field"
                />
                {editForm.assigned_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editForm.assigned_skills.map(skill => (
                      <span key={skill} className="text-xs bg-dashi-surface text-dashi-muted px-3 py-1 rounded-lg border border-dashi-border">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-dashi-border flex justify-end gap-3">
              <button
                onClick={() => setEditingAgent(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents?.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEdit={handleEdit}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>
    </div>
  );
}

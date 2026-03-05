import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import ProjectCard from '../components/ProjectCard';
import StatusBadge from '../components/StatusBadge';

export default function Projects() {
  const { data: projects, loading, error, refresh } = usePolling(api.getProjects, 30000);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async () => {
    try {
      await api.createProject(newProject);
      setShowNewProject(false);
      setNewProject({ name: '', description: '' });
      refresh();
      showMessage('Project created');
    } catch (err) {
      console.error('Failed to create project:', err);
      showMessage('Failed to create project', 'error');
    }
  };

  const handleRestart = async (id) => {
    try {
      await api.restartProject(id);
      showMessage('Restart requested');
    } catch (err) {
      console.error('Failed to restart:', err);
      showMessage('Failed to restart project', 'error');
    }
  };

  const project = projects?.find(p => p.id === selectedProject);

  if (loading && !projects) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 text-dashi-muted">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        Loading projects...
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-dashi-danger">Error: {error}</div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto px-6 py-6">
      {message && (
        <div className={`mb-4 p-3 rounded-xl border text-sm ${
          message.type === 'error'
            ? 'bg-dashi-danger/10 text-dashi-danger border-dashi-danger/30'
            : 'bg-dashi-success/10 text-dashi-success border-dashi-success/30'
        }`}>
          {message.text}
        </div>
      )}
      <div className="h-full flex gap-6">
        {/* Sidebar */}
        <div className="w-80 glass-card flex flex-col">
          <div className="p-4 border-b border-dashi-border flex items-center justify-between">
            <h3 className="font-semibold text-white">Projects</h3>
            <button
              onClick={() => setShowNewProject(true)}
              className="text-sm btn-primary px-3 py-1.5 text-xs"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projects?.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                isSelected={selectedProject === p.id}
                onClick={() => { setSelectedProject(p.id); setShowNewProject(false); }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 glass-card overflow-y-auto">
          {showNewProject ? (
            <div className="p-8 max-w-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <span className="text-xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold text-white">New Project</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dashi-muted mb-2">Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dashi-muted mb-2">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="btn-primary"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          ) : project ? (
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                  <p className="text-dashi-muted mt-2">{project.description}</p>
                  <div className="flex items-center gap-3 mt-4">
                    <StatusBadge status={project.status} />
                    {project.last_deployed && (
                      <span className="text-sm text-dashi-muted">
                        Last deployed: {new Date(project.last_deployed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRestart(project.id)}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restart
                </button>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dashi-surface border border-dashi-border rounded-xl hover:border-dashi-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dashi-card flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <span className="text-white font-medium">GitHub</span>
                    <svg className="w-5 h-5 text-dashi-muted ml-auto group-hover:text-dashi-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {project.fly_app_name && (
                  <a
                    href={`https://fly.io/apps/${project.fly_app_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dashi-surface border border-dashi-border rounded-xl hover:border-dashi-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dashi-card flex items-center justify-center">
                      <span className="text-xl">🚀</span>
                    </div>
                    <span className="text-white font-medium">Fly.io Dashboard</span>
                    <svg className="w-5 h-5 text-dashi-muted ml-auto group-hover:text-dashi-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {project.live_url && (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dashi-surface border border-dashi-border rounded-xl hover:border-dashi-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dashi-card flex items-center justify-center">
                      <span className="text-xl">🌐</span>
                    </div>
                    <span className="text-white font-medium">Live Site</span>
                    <svg className="w-5 h-5 text-dashi-muted ml-auto group-hover:text-dashi-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {project.twilio_sid && (
                  <a
                    href={`https://console.twilio.com/us1/develop/phone-numbers/manage/incoming/${project.twilio_sid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dashi-surface border border-dashi-border rounded-xl hover:border-dashi-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dashi-card flex items-center justify-center">
                      <span className="text-xl">📞</span>
                    </div>
                    <span className="text-white font-medium">Twilio Console</span>
                    <svg className="w-5 h-5 text-dashi-muted ml-auto group-hover:text-dashi-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dashi-muted">
              <div className="w-20 h-20 rounded-3xl bg-dashi-surface flex items-center justify-center mb-4">
                <span className="text-4xl opacity-30">🚀</span>
              </div>
              <p className="text-lg font-medium">Select a project</p>
              <p className="text-sm mt-1">Choose a project from the sidebar to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

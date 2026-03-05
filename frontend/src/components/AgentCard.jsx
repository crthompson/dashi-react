export default function AgentCard({ agent, onEdit, onSetDefault }) {
  const initials = agent.name?.charAt(0).toUpperCase() || '?';
  
  return (
    <div className="glass-card p-5 hover:border-dashi-border-hover transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header with avatar and name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white truncate">{agent.name}</h3>
                {agent.is_default && (
                  <span className="inline-flex items-center gap-1 text-xs bg-dashi-warning/10 text-dashi-warning px-2 py-0.5 rounded-lg border border-dashi-warning/20">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    Default
                  </span>
                )}
              </div>
              
              {/* Model badge */}
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-dashi-primary/10 text-dashi-primary rounded-lg text-xs font-medium border border-dashi-primary/20">
                {agent.model || 'Unknown model'}
              </span>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm text-dashi-muted mt-3 line-clamp-2">
            {agent.description || 'No description'}
          </p>
          
          {/* Workspace if set */}
          {agent.workspace && (
            <p className="text-xs text-dashi-muted/50 mt-2 truncate flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {agent.workspace}
            </p>
          )}
          
          {/* Skills */}
          {agent.assigned_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {agent.assigned_skills.slice(0, 4).map(skill => (
                <span key={skill} className="text-xs bg-dashi-surface text-dashi-muted px-2.5 py-1 rounded-lg border border-dashi-border">
                  {skill}
                </span>
              ))}
              {agent.assigned_skills.length > 4 && (
                <span className="text-xs text-dashi-muted px-1">
                  +{agent.assigned_skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-dashi-border">
        <button
          onClick={() => onEdit(agent)}
          className="flex-1 text-sm text-dashi-primary hover:text-white hover:bg-dashi-primary/20 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Edit
        </button>
        {!agent.is_default && (
          <button
            onClick={() => onSetDefault(agent.id)}
            className="flex-1 text-sm text-dashi-muted hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Set Default
          </button>
        )}
      </div>
    </div>
  );
}

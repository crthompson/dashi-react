import StatusBadge from './StatusBadge';

export default function ProjectCard({ project, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected 
          ? 'bg-dashi-primary/10 border-dashi-primary/50' 
          : 'bg-dashi-surface border-dashi-border hover:border-dashi-border-hover hover:bg-dashi-card'
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white truncate">{project.name}</h4>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-sm text-dashi-muted mt-2 truncate">{project.description || 'No description'}</p>
      {project.last_deployed && (
        <p className="text-xs text-dashi-muted/60 mt-3">
          Deployed {new Date(project.last_deployed).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

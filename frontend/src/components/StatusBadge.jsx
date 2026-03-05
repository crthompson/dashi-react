export default function StatusBadge({ status }) {
  const styles = {
    running: 'bg-dashi-success/10 text-dashi-success border-dashi-success/20',
    stopped: 'bg-dashi-muted/10 text-dashi-muted border-dashi-muted/20',
    error: 'bg-dashi-danger/10 text-dashi-danger border-dashi-danger/20',
    unknown: 'bg-dashi-warning/10 text-dashi-warning border-dashi-warning/20',
    development: 'bg-dashi-primary/10 text-dashi-primary border-dashi-primary/20'
  };
  
  const dotColors = {
    running: 'bg-dashi-success',
    stopped: 'bg-dashi-muted',
    error: 'bg-dashi-danger',
    unknown: 'bg-dashi-warning',
    development: 'bg-dashi-primary'
  };
  
  const style = styles[status] || styles.unknown;
  const dotColor = dotColors[status] || dotColors.unknown;
  
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
}

import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import SpendChart from '../components/SpendChart';

export default function Spend() {
  const { data: summary, loading: summaryLoading } = usePolling(api.getSpendSummary, 60000);
  const { data: dailyData, loading: dailyLoading } = usePolling(() => api.getSpendDaily(30), 60000);
  const { data: byProject, loading: projectLoading } = usePolling(api.getSpendByProject, 60000);

  const totalSpend = summary?.reduce((acc, s) => acc + s.total_cost, 0) || 0;

  const handlePoll = async () => {
    try {
      await api.pollSpend();
      window.location.reload();
    } catch (err) {
      console.error('Failed to poll:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow-accent">
            <span className="text-2xl">💰</span>
          </div>
          <div>
            <h2 className="page-title">Spend Tracker</h2>
            <p className="page-subtitle">Monitor your AI usage costs</p>
          </div>
        </div>
        <button
          onClick={handlePoll}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dashi-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <p className="text-sm text-dashi-muted mb-1">Total Spend</p>
          <p className="text-4xl font-bold text-white">${totalSpend.toFixed(2)}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-dashi-muted">
            <span className="w-2 h-2 rounded-full bg-dashi-success" />
            All time
          </div>
        </div>
        
        {summary?.map(s => (
          <div key={s.provider} className="stat-card relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 ${
              s.provider === 'moonshot' ? 'bg-dashi-primary/10' : 'bg-dashi-accent/10'
            }`} />
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${
                s.provider === 'moonshot' ? 'bg-dashi-primary' : 'bg-dashi-accent'
              }`} />
              <p className="text-sm text-dashi-muted capitalize">{s.provider}</p>
            </div>
            <p className="text-4xl font-bold text-white">${s.total_cost.toFixed(2)}</p>
            <p className="text-sm text-dashi-muted mt-4">
              {(s.total_tokens_in + s.total_tokens_out).toLocaleString()} tokens
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Daily Spend (Last 30 Days)</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dashi-primary" />
              <span className="text-dashi-muted">Moonshot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dashi-accent" />
              <span className="text-dashi-muted">Claude</span>
            </div>
          </div>
        </div>
        {dailyLoading ? (
          <div className="flex items-center justify-center py-12 text-dashi-muted">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Loading chart...
          </div>
        ) : (
          <SpendChart data={dailyData || []} />
        )}
      </div>

      {/* By Project Table */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Spend by Project</h3>
        {projectLoading ? (
          <div className="flex items-center justify-center py-12 text-dashi-muted">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dashi-border">
                  <th className="text-left py-3 text-sm font-medium text-dashi-muted">Project</th>
                  <th className="text-right py-3 text-sm font-medium text-dashi-muted">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byProject?.map((p, idx) => (
                  <tr key={p.project} className="border-b border-dashi-border/50 last:border-0">
                    <td className="py-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-dashi-surface flex items-center justify-center text-sm">
                          {idx + 1}
                        </div>
                        {p.project}
                      </div>
                    </td>
                    <td className="py-4 text-right text-white font-medium">${p.cost.toFixed(2)}</td>
                  </tr>
                ))}
                {(!byProject || byProject.length === 0) && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-dashi-muted">
                      <div className="w-16 h-16 rounded-2xl bg-dashi-surface flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl opacity-30">📊</span>
                      </div>
                      No project data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

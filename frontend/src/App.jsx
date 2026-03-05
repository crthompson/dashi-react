import { Suspense, lazy } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';

const Chat = lazy(() => import('./pages/Chat'));
const Agents = lazy(() => import('./pages/Agents'));
const Spend = lazy(() => import('./pages/Spend'));
const Projects = lazy(() => import('./pages/Projects'));

const tabs = [
  { path: '/', label: 'Chat', icon: '💬' },
  { path: '/agents', label: 'Agents', icon: '🤖' },
  { path: '/spend', label: 'Spend', icon: '💰' },
  { path: '/projects', label: 'Projects', icon: '🚀' },
];

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="glass-card p-6 text-dashi-muted flex items-center gap-3">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading page...
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-dashi-bg">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-dashi-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-dashi-accent/10 rounded-full blur-3xl" />
      </div>

      <nav className="relative border-b border-dashi-border bg-dashi-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <span className="text-xl">🦞</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">Dashi</span>
                  <span className="text-[10px] uppercase tracking-wider bg-dashi-primary/15 text-dashi-primary px-2 py-0.5 rounded-full">beta</span>
                </div>
                <span className="text-xs text-dashi-muted">AI Dashboard</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {tabs.map(tab => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/spend" element={<Spend />} />
            <Route path="/projects" element={<Projects />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;

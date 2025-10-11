import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Health Check', to: '/' },
  // future nav items can be added here
];

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="mb-8">
          <span className="block text-sm font-semibold uppercase tracking-wide text-slate-400">
            BestChoice
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">Control Center</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <footer className="mt-8 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} BestChoice</p>
        </footer>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-8 py-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Monitor service health and status</p>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

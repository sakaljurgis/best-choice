import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useProjectsQuery } from '../query/projects';

const navItems: Array<{ label: string; to: string; end?: boolean }> = [
  { label: 'Projects', to: '/projects' }
];

function AppLayout() {
  const location = useLocation();
  const { data, isLoading, isError } = useProjectsQuery();

  const projects = data?.data ?? [];

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 3),
    [projects]
  );

  const isInitialDesktop = typeof window !== 'undefined'
    ? window.matchMedia('(min-width: 768px)').matches
    : false;

  const [isDesktop, setIsDesktop] = useState(isInitialDesktop);
  const [isNavOpen, setIsNavOpen] = useState(isInitialDesktop);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(min-width: 768px)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      setIsNavOpen(event.matches);
    };

    setIsDesktop(media.matches);
    setIsNavOpen(media.matches);

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsNavOpen(false);
    }
  }, [location.pathname, isDesktop]);

  const handleToggleNav = () => {
    setIsNavOpen((current) => !current);
  };

  const handleNavLinkClick = () => {
    if (!isDesktop) {
      setIsNavOpen(false);
    }
  };

  const asideClassName = isDesktop
    ? [
        'relative z-30 flex flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-200 ease-out',
        isNavOpen ? 'w-64' : 'w-0 border-transparent shadow-none overflow-hidden'
      ].join(' ')
    : [
        'fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 ease-out',
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      ].join(' ');

  const asideInnerClassName = [
    'flex flex-1 flex-col',
    isDesktop
      ? isNavOpen
        ? 'px-6 py-8'
        : 'px-0 py-0 opacity-0 pointer-events-none'
      : 'px-6 py-8'
  ].join(' ');

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {!isDesktop && isNavOpen ? (
        <button
          type="button"
          aria-label="Hide navigation"
          className="fixed inset-0 z-20 bg-slate-900/30 md:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={asideClassName}
        aria-hidden={!isNavOpen}
      >
        <div className={asideInnerClassName}>
          <div className="mb-8">
            <span className="block text-sm font-semibold uppercase tracking-wide text-slate-400">
              BestChoice
            </span>
            <h1 className="text-2xl font-semibold text-slate-900">Control Center</h1>
          </div>

          <nav className="flex flex-1 flex-col">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={handleNavLinkClick}
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
            </div>

            <div className="mt-8">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recent Projects
              </p>
              <div className="mt-3 flex flex-col gap-1">
                {isLoading ? (
                  <span className="px-3 py-2 text-xs text-slate-400">
                    Loading projects…
                  </span>
                ) : isError ? (
                  <span className="px-3 py-2 text-xs text-red-500">
                    Couldn&apos;t load projects.
                  </span>
                ) : recentProjects.length ? (
                  recentProjects.map((project) => (
                    <NavLink
                      key={project.id}
                      to={`/projects/${project.id}`}
                      onClick={handleNavLinkClick}
                      className={({ isActive }) =>
                        [
                          'rounded-md px-3 py-2 text-sm font-medium transition',
                          isActive
                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        ].join(' ')
                      }
                    >
                      <span className="block truncate">{project.name}</span>
                    </NavLink>
                  ))
                ) : (
                  <span className="px-3 py-2 text-xs text-slate-400">
                    No projects yet.
                  </span>
                )}
              </div>
            </div>
          </nav>

          <footer className="mt-8 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} BestChoice</p>
          </footer>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-8 md:py-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={isNavOpen ? 'Hide navigation' : 'Show navigation'}
              aria-controls="app-sidebar"
              aria-expanded={isNavOpen}
              onClick={handleToggleNav}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:h-9 md:w-9"
            >
              {isNavOpen ? (
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M14.78 5.22a.75.75 0 010 1.06L11.06 10l3.72 3.72a.75.75 0 11-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 11-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 011.06-1.06L10 8.94l3.72-3.72a.75.75 0 011.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zm0 4.25A.75.75 0 013.75 9h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 9.75zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
                </svg>
              )}
            </button>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Projects Dashboard</h2>
              <p className="text-sm text-slate-500">
                Organize research projects, compare items, and monitor price trends.
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Clapperboard,
  LayoutDashboard,
  CalendarDays,
  Ticket,
  LogOut,
  Menu,
  X,
  Plus,
  Users,
  ScanLine,
  Armchair,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { cn } from '../../utils/format';
import {
  ROLE_LABELS,
  canQuickAction,
  canSeeNav,
  normalizeRole,
} from '../../utils/roles';

const nav = [
  { to: '/', label: 'Home', full: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movies', label: 'Films', full: 'Movies', icon: Clapperboard },
  { to: '/shows', label: 'Shows', full: 'Shows', icon: CalendarDays },
  { to: '/bookings', label: 'Tickets', full: 'Bookings', icon: Ticket },
  { to: '/verify', label: 'Scan', full: 'Verify / Scanner', icon: ScanLine },
];

const sideOnly = [
  { to: '/theaters', label: 'Screens', full: 'Theaters / Screens', icon: Armchair },
  { to: '/users', label: 'Users', full: 'Users', icon: Users },
];

export default function AppLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = normalizeRole(admin?.role);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const mainNav = useMemo(
    () => nav.filter((item) => canSeeNav(role, item.to)),
    [role]
  );
  const extraNav = useMemo(
    () => sideOnly.filter((item) => canSeeNav(role, item.to)),
    [role]
  );
  const showAddMovie = canQuickAction(role, 'movie');
  const showAddShow = canQuickAction(role, 'show');
  const showAddBooking = canQuickAction(role, 'booking');
  const bottomCols = Math.min(5, Math.max(1, mainNav.length));

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-dvh overflow-x-clip lg:grid lg:grid-cols-[250px_1fr]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[min(280px,85vw)] bg-gradient-to-b from-ink to-ink-soft text-white shadow-xl transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col safe-bottom">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div>
              <p className="text-xl font-extrabold leading-tight">
                Savan <span className="text-gold">Sentosa</span>
              </p>
              <p className="mt-1 text-xs text-white/60">Cinema Admin</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-white/15 p-2 text-white/80 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {[...mainNav, ...extraNav].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-teal text-white shadow-md shadow-teal/30'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <item.icon size={18} />
                {item.full}
              </NavLink>
            ))}

            {(showAddMovie || showAddShow || showAddBooking) && (
              <div className="pt-4">
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Quick actions
                </p>
                {showAddMovie && (
                  <NavLink
                    to="/movies/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/10"
                  >
                    <Plus size={18} /> Add Movie
                  </NavLink>
                )}
                {showAddShow && (
                  <NavLink
                    to="/shows/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/10"
                  >
                    <Plus size={18} /> Add Show
                  </NavLink>
                )}
                {showAddBooking && (
                  <NavLink
                    to="/bookings/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/10"
                  >
                    <Plus size={18} /> Create Booking
                  </NavLink>
                )}
              </div>
            )}
          </nav>

          <div className="border-t border-white/10 p-4">
            <p className="text-sm font-bold">{admin?.name || 'Admin'}</p>
            <p className="truncate text-xs text-white/50">{admin?.email}</p>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gold/90">
              {ROLE_LABELS[role] || role}
            </p>
            <Button
              variant="outline"
              className="w-full border-white/20 bg-transparent text-white hover:border-gold hover:text-gold"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Logout
            </Button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="min-w-0 overflow-x-clip pb-nav lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 px-3 py-2.5 backdrop-blur sm:px-4 md:px-6 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                className="shrink-0 rounded-xl border border-line bg-surface p-2.5 shadow-sm lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted sm:text-xs">{greeting}</p>
                <p className="truncate text-base font-bold text-ink sm:text-lg">Savan Sentosa</p>
              </div>
            </div>
            {showAddBooking && (
              <Button
                variant="gold"
                size="sm"
                className="shrink-0 px-2.5 sm:px-3"
                onClick={() => navigate('/bookings/new')}
                aria-label="New booking"
              >
                <Ticket size={16} />
                <span className="hidden sm:inline">New booking</span>
              </Button>
            )}
          </div>
        </header>

        <main className="min-w-0 px-3 py-4 sm:px-4 md:px-6 md:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {mainNav.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/95 px-1.5 pt-1.5 backdrop-blur safe-bottom lg:hidden">
          <div
            className="mx-auto grid max-w-lg gap-0.5 pb-1"
            style={{ gridTemplateColumns: `repeat(${bottomCols}, minmax(0, 1fr))` }}
          >
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold',
                    isActive ? 'bg-teal/10 text-teal' : 'text-muted'
                  )
                }
              >
                <item.icon size={18} />
                <span className="leading-none">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

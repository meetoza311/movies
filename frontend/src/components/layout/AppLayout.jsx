import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { cn } from '../../utils/format';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movies', label: 'Movies', icon: Clapperboard },
  { to: '/shows', label: 'Shows', icon: CalendarDays },
  { to: '/bookings', label: 'Bookings', icon: Ticket },
];

export default function AppLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[250px] bg-gradient-to-b from-ink to-ink-soft text-white shadow-xl transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-xl font-extrabold leading-tight">
              Savan <span className="text-gold">Sentosa</span>
            </p>
            <p className="mt-1 text-xs text-white/60">Cinema Admin</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-teal text-white shadow-md shadow-teal/30'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="pt-4">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                Quick actions
              </p>
              <NavLink
                to="/movies/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10"
              >
                <Plus size={18} /> Add Movie
              </NavLink>
              <NavLink
                to="/shows/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10"
              >
                <Plus size={18} /> Add Show
              </NavLink>
              <NavLink
                to="/bookings/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10"
              >
                <Plus size={18} /> Create Booking
              </NavLink>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <p className="text-sm font-bold">{admin?.name || 'Admin'}</p>
            <p className="mb-3 truncate text-xs text-white/50">{admin?.email}</p>
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

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-line bg-surface p-2 shadow-sm lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div>
                <p className="text-xs font-semibold text-muted">{greeting}</p>
                <p className="text-base font-bold text-ink sm:text-lg">Savan Sentosa</p>
              </div>
            </div>
            <Button
              variant="gold"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate('/bookings/new')}
            >
              <Ticket size={16} /> New booking
            </Button>
          </div>
        </header>

        <main className="px-3 py-4 sm:px-4 md:px-6 lg:px-8 md:py-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold',
                  isActive ? 'bg-teal/10 text-teal' : 'text-muted'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

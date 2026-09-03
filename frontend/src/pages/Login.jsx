import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading('Connecting to server…');
    try {
      await login(email, password);
      toast.success('Welcome to Savan Sentosa', { id: toastId });
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-x-clip px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(225,29,72,0.88), rgba(26,16,64,0.9)), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80')",
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl">
        <div className="bg-gradient-to-r from-teal to-ink px-6 py-8 text-center text-white">
          <p className="text-3xl font-extrabold">
            Savan <span className="text-gold">Sentosa</span>
          </p>
          <p className="mt-2 text-sm text-white/80">Cinema Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">Admin sign in</h1>
            <p className="mt-1 text-sm text-muted">Enter your admin email and password.</p>
          </div>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter admin email"
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Sign in
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-muted">
            First open after idle can take up to a minute (free Render hosting waking up).
            After that, it stays fast while you use the app.
          </p>
        </form>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Movies from './pages/Movies';
import MovieDetails from './pages/MovieDetails';
import MovieForm from './pages/MovieForm';
import Shows from './pages/Shows';
import ShowDetails from './pages/ShowDetails';
import ShowForm from './pages/ShowForm';
import Bookings from './pages/Bookings';
import BookingCreate from './pages/BookingCreate';
import BookingDetails from './pages/BookingDetails';
import Users from './pages/Users';
import Verify from './pages/Verify';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="movies" element={<Movies />} />
                <Route path="movies/new" element={<MovieForm />} />
                <Route path="movies/:id" element={<MovieDetails />} />
                <Route path="movies/:id/edit" element={<MovieForm />} />
                <Route path="shows" element={<Shows />} />
                <Route path="shows/new" element={<ShowForm />} />
                <Route path="shows/:id" element={<ShowDetails />} />
                <Route path="shows/:id/edit" element={<ShowForm />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/new" element={<BookingCreate />} />
                <Route path="bookings/:id" element={<BookingDetails />} />
                <Route path="verify" element={<Verify />} />
                <Route path="users" element={<Users />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { showApi } from '../services/showApi';
import { movieApi } from '../services/movieApi';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';

const empty = {
  movieId: '',
  showDate: '',
  startTime: '19:30',
  endTime: '22:00',
  totalSeats: 100,
  ownerPrice: 50,
  guestPrice: 80,
  status: 'scheduled',
};

export default function ShowForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    ...empty,
    movieId: searchParams.get('movieId') || '',
  });

  const moviesQuery = useQuery({
    queryKey: ['movies', { limit: 100 }],
    queryFn: () => movieApi.list({ limit: 100 }),
  });

  const showQuery = useQuery({
    queryKey: ['show', id],
    queryFn: () => showApi.get(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (showQuery.data?.data) {
      const s = showQuery.data.data;
      setForm({
        movieId: s.movieId?._id || s.movieId,
        showDate: s.showDate ? String(s.showDate).slice(0, 10) : '',
        startTime: s.startTime,
        endTime: s.endTime,
        totalSeats: s.totalSeats,
        ownerPrice: s.ownerPrice ?? 50,
        guestPrice: s.guestPrice ?? s.seatPrice ?? 80,
        status: s.status,
      });
    }
  }, [showQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? showApi.update(id, payload) : showApi.create(payload)),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Show updated' : 'Show created');
      qc.invalidateQueries({ queryKey: ['shows'] });
      navigate(`/shows/${res.data._id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      movieId: form.movieId,
      showDate: form.showDate,
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
      ownerPrice: Number(form.ownerPrice),
      guestPrice: Number(form.guestPrice),
    };
    if (!isEdit) {
      payload.totalSeats = Number(form.totalSeats);
    }
    mutation.mutate(payload);
  }

  if (isEdit && showQuery.isLoading) return <Skeleton className="h-96" />;
  if (isEdit && showQuery.error) return <ErrorState message={showQuery.error.message} />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit Show' : 'Add Show'}
        subtitle="Set timing, capacity, and Guest / Owner seat prices"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
      >
        <Select
          label="Movie"
          value={form.movieId}
          onChange={(e) => update('movieId', e.target.value)}
          required
          disabled={isEdit}
        >
          <option value="">Select movie</option>
          {(moviesQuery.data?.data || []).map((m) => (
            <option key={m._id} value={m._id}>
              {m.title}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Show date"
            type="date"
            value={form.showDate}
            onChange={(e) => update('showDate', e.target.value)}
            required
          />
          <Input
            label="Start time"
            type="time"
            value={form.startTime}
            onChange={(e) => update('startTime', e.target.value)}
            required
          />
          <Input
            label="End time"
            type="time"
            value={form.endTime}
            onChange={(e) => update('endTime', e.target.value)}
            required
          />
          {!isEdit && (
            <Input
              label="Total seats"
              type="number"
              min="1"
              value={form.totalSeats}
              onChange={(e) => update('totalSeats', e.target.value)}
              required
            />
          )}
          <Input
            label="Owner price (₹)"
            type="number"
            min="0"
            value={form.ownerPrice}
            onChange={(e) => update('ownerPrice', e.target.value)}
            required
          />
          <Input
            label="Guest price (₹)"
            type="number"
            min="0"
            value={form.guestPrice}
            onChange={(e) => update('guestPrice', e.target.value)}
            required
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <p className="rounded-xl bg-paper px-3 py-2 text-xs text-muted">
          Default prices: Owner ₹50 · Guest ₹80. Any seat can be either type — no seat limits.
        </p>

        {isEdit && (
          <p className="text-xs text-muted">
            Total seats cannot be changed after creation ({form.totalSeats} seats).
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create show'}
          </Button>
        </div>
      </form>
    </div>
  );
}

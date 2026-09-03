import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { movieApi } from '../services/movieApi';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, TextArea } from '../components/common/Input';
import PosterField from '../components/common/PosterField';

const empty = {
  title: '',
  description: '',
  posterImage: '',
  price: 200,
};

export default function MovieForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data, isLoading, error } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => movieApi.get(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data?.data) {
      const m = data.data;
      setForm({
        title: m.title || '',
        description: m.description || '',
        posterImage: m.posterImage || '',
        price: m.price ?? 0,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? movieApi.update(id, payload) : movieApi.create(payload),
    onSuccess: (res) => {
      if (res.meta?.autoRemoved && res.meta.removedMovies?.length) {
        toast.success(
          `Movie saved. Removed oldest: ${res.meta.removedMovies.join(', ')} (max 10 movies)`,
          { duration: 5000 }
        );
      } else {
        toast.success(isEdit ? 'Movie updated' : 'Movie created');
      }
      qc.invalidateQueries({ queryKey: ['movies'] });
      qc.invalidateQueries({ queryKey: ['shows'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/movies/${res.data._id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      title: form.title.trim(),
      description: form.description,
      posterImage: form.posterImage,
      price: Number(form.price),
    });
  }

  if (isEdit && isLoading) return <Skeleton className="h-96" />;
  if (isEdit && error) return <ErrorState message={error.message} />;

  return (
    <div className="mx-auto min-w-0 max-w-2xl">
      <PageHeader
        title={isEdit ? 'Edit Movie' : 'Add Movie'}
        subtitle="Name, poster, description, and price (max 10 movies — oldest auto-removed)"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
      >
        <Input
          label="Movie name"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          required
          placeholder="Enter movie name"
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Poster image</p>
          <PosterField
            value={form.posterImage}
            onChange={(val) => update('posterImage', val)}
          />
        </div>

        <TextArea
          label="Description"
          rows={4}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Short description of the movie"
        />

        <Input
          label="Seat price (₹)"
          type="number"
          min="0"
          value={form.price}
          onChange={(e) => update('price', e.target.value)}
          required
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create movie'}
          </Button>
        </div>
      </form>
    </div>
  );
}

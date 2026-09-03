import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/format';

export default function MovieCard({ movie, onEdit, onDelete }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-teal/10 to-gold/10 sm:aspect-[2/3]">
        {movie.posterImage ? (
          <img
            src={movie.posterImage}
            alt={`${movie.title} poster`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-bold text-ink/20">
            {movie.title?.slice(0, 1) || 'M'}
          </div>
        )}
      </div>
      <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-tight text-ink sm:text-lg">
            {movie.title}
          </h3>
          {movie.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted sm:text-sm">{movie.description}</p>
          ) : null}
        </div>
        <p className="text-xl font-extrabold text-teal">{formatCurrency(movie.price)}</p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/movies/${movie._id}`}>
            <Button size="sm" variant="outline">
              View
            </Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={() => onEdit?.(movie)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete?.(movie)}>
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

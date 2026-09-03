import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';

export default function MovieCard({ movie, onEdit, onDelete }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-md">
      <Link to={`/movies/${movie._id}`} className="block">
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
      </Link>
      <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
        <div>
          <Link to={`/movies/${movie._id}`}>
            <h3 className="line-clamp-2 text-sm font-bold leading-tight text-ink sm:text-lg">
              {movie.title}
            </h3>
          </Link>
          {movie.description ? (
            <p className="mt-1 hidden line-clamp-2 text-sm text-muted sm:block">
              {movie.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Link to={`/movies/${movie._id}`} className="min-w-0 flex-1">
            <Button size="sm" variant="outline" className="w-full px-2">
              View
            </Button>
          </Link>
          <Button
            size="icon"
            variant="secondary"
            className="shrink-0"
            onClick={() => onEdit?.(movie)}
            aria-label="Edit movie"
          >
            <Pencil size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => onDelete?.(movie)}
            aria-label="Delete movie"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

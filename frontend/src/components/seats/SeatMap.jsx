import { cn } from '../../utils/format';

export function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted">
      <LegendSwatch className="border-line bg-surface" label="Available" />
      <LegendSwatch className="border-teal bg-teal text-white" label="Selected" />
      <LegendSwatch className="border-ink/20 bg-ink/15 text-ink/40 line-through" label="Booked" />
    </div>
  );
}

function LegendSwatch({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border text-[10px]',
          className
        )}
        aria-hidden
      >
        A1
      </span>
      {label}
    </span>
  );
}

export default function SeatMap({
  seats = [],
  selected = [],
  onToggle,
  readonly = false,
}) {
  const selectedSet = new Set(selected.map((s) => s.toUpperCase()));

  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const rowKeys = Object.keys(rows).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-xl px-6">
        <div className="cinema-screen py-3 text-center text-xs font-bold uppercase tracking-[0.35em] text-muted">
          Screen
        </div>
      </div>

      <SeatLegend />

      <div className="overflow-x-auto pb-2">
        <div className="mx-auto inline-block min-w-full space-y-2 px-1 sm:min-w-0">
          {rowKeys.map((row) => (
            <div key={row} className="flex items-center justify-center gap-2">
              <span className="w-6 text-center text-xs font-bold text-muted">{row}</span>
              <div className="flex gap-1.5">
                {rows[row]
                  .sort((a, b) => a.column - b.column)
                  .map((seat) => {
                    const isBooked = seat.status === 'BOOKED';
                    const isSelected = selectedSet.has(seat.seatNumber);
                    const label = isBooked
                      ? `${seat.seatNumber} booked`
                      : isSelected
                        ? `${seat.seatNumber} selected`
                        : `${seat.seatNumber} available`;

                    return (
                      <button
                        key={seat.seatNumber}
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={isSelected}
                        disabled={readonly || isBooked}
                        onClick={() => onToggle?.(seat.seatNumber)}
                        className={cn(
                          'h-9 min-w-9 rounded-md border px-1.5 text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
                          isBooked &&
                            'cursor-not-allowed border-ink/10 bg-ink/10 text-ink/35 line-through',
                          !isBooked &&
                            isSelected &&
                            'border-teal bg-teal text-white shadow-sm',
                          !isBooked &&
                            !isSelected &&
                            'border-line bg-surface text-ink hover:border-teal hover:text-teal'
                        )}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
              </div>
              <span className="w-6 text-center text-xs font-bold text-muted">{row}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { cn } from '../../utils/format';

export function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted sm:gap-x-4 sm:text-xs">
      <LegendSwatch className="border-line bg-surface" label="Available" />
      <LegendSwatch className="border-teal bg-teal text-white" label="Selected" />
      <LegendSwatch className="border-ink/20 bg-ink/15 text-ink/40" label="Booked" />
    </div>
  );
}

function LegendSwatch({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn('inline-block h-3.5 w-3.5 rounded-sm border sm:h-4 sm:w-4', className)}
        aria-hidden
      />
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
  const selectedSet = useMemo(
    () => new Set(selected.map((s) => String(s).toUpperCase().trim())),
    [selected]
  );

  const { rowKeys, rows, maxCols } = useMemo(() => {
    const grouped = seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});

    const keys = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    keys.forEach((key) => {
      grouped[key].sort((a, b) => a.column - b.column);
    });

    const cols = keys.reduce(
      (max, key) => Math.max(max, grouped[key].length, ...grouped[key].map((s) => s.column)),
      1
    );

    return { rowKeys: keys, rows: grouped, maxCols: cols };
  }, [seats]);

  function handleToggle(seatNumber) {
    if (readonly || !onToggle) return;
    onToggle(String(seatNumber).toUpperCase().trim());
  }

  // Keep labels readable when many columns squeeze seats
  const seatLabelClass =
    maxCols >= 14
      ? 'text-[8px] sm:text-[10px]'
      : maxCols >= 12
        ? 'text-[9px] sm:text-[10px]'
        : 'text-[10px] sm:text-[11px]';

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <div className="px-6 sm:px-10">
        <div className="cinema-screen py-2 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-muted sm:py-2.5 sm:text-[10px]">
          Screen this way
        </div>
      </div>

      <SeatLegend />

      <div className="w-full space-y-1 sm:space-y-1.5">
        {rowKeys.map((row) => {
          const byColumn = new Map(rows[row].map((seat) => [seat.column, seat]));

          return (
            <div key={row} className="flex w-full items-center gap-1 sm:gap-1.5">
              <span className="w-3.5 shrink-0 text-center text-[9px] font-bold text-muted sm:w-5 sm:text-xs">
                {row}
              </span>

              <div
                className="grid min-w-0 flex-1 gap-0.5 sm:gap-1"
                style={{
                  gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: maxCols }, (_, index) => {
                  const column = index + 1;
                  const seat = byColumn.get(column);

                  if (!seat) {
                    return <span key={`${row}-empty-${column}`} className="aspect-square" />;
                  }

                  const seatNumber = String(seat.seatNumber).toUpperCase().trim();
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSet.has(seatNumber);
                  const canSelect = !readonly && !isBooked && Boolean(onToggle);
                  const label = isBooked
                    ? `${seatNumber} booked`
                    : isSelected
                      ? `${seatNumber} selected`
                      : `${seatNumber} available`;

                  return (
                    <button
                      key={seatNumber}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={isSelected}
                      disabled={!canSelect}
                      onClick={() => handleToggle(seatNumber)}
                      className={cn(
                        'aspect-square w-full touch-manipulation select-none rounded-[4px] border font-bold transition active:scale-90 sm:rounded-md',
                        'flex items-center justify-center',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal',
                        seatLabelClass,
                        isBooked &&
                          'cursor-not-allowed border-ink/10 bg-ink/10 text-ink/35 line-through',
                        !isBooked &&
                          isSelected &&
                          'border-teal bg-teal text-white shadow-sm',
                        !isBooked &&
                          !isSelected &&
                          canSelect &&
                          'border-line bg-surface text-ink active:border-teal active:bg-teal/10',
                        !isBooked &&
                          !isSelected &&
                          !canSelect &&
                          'border-line bg-surface text-ink'
                      )}
                    >
                      <span className="sm:hidden">{column}</span>
                      <span className="hidden sm:inline">{seatNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

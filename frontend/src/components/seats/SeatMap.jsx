import { useMemo } from 'react';
import { cn } from '../../utils/format';

export function SeatLegend({ mode = 'book' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted sm:gap-x-4 sm:text-xs">
      <LegendSwatch className="border-line bg-surface" label="Available" />
      {mode === 'book' && (
        <>
          <LegendSwatch className="border-sky bg-sky text-white" label="Selected guest" />
          <LegendSwatch className="border-gold bg-gold text-ink" label="Selected owner" />
        </>
      )}
      {mode === 'view' && (
        <LegendSwatch className="border-teal ring-2 ring-teal bg-teal text-white" label="My seats" />
      )}
      <LegendSwatch className="border-sky/40 bg-sky/25 text-sky" label="Guest booked" />
      <LegendSwatch className="border-gold/50 bg-gold/30 text-warn" label="Owner booked" />
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

/**
 * selected: string[] OR [{ seatNumber, category }]
 * highlightSeats: string[] — my booking seats (view mode)
 * activeCategory: GUEST | OWNER — color for newly selected seats
 */
export default function SeatMap({
  seats = [],
  selected = [],
  highlightSeats = [],
  activeCategory = 'GUEST',
  onToggle,
  readonly = false,
  mode = 'book',
}) {
  const selectedMap = useMemo(() => {
    const map = new Map();
    selected.forEach((s) => {
      if (typeof s === 'string') {
        map.set(String(s).toUpperCase().trim(), activeCategory);
      } else if (s?.seatNumber) {
        map.set(
          String(s.seatNumber).toUpperCase().trim(),
          String(s.category || activeCategory).toUpperCase()
        );
      }
    });
    return map;
  }, [selected, activeCategory]);

  const highlightSet = useMemo(
    () => new Set(highlightSeats.map((s) => String(s).toUpperCase().trim())),
    [highlightSeats]
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

      <SeatLegend mode={mode} />

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
                  const bookedCategory = String(seat.category || 'GUEST').toUpperCase();
                  const selectedCategory = selectedMap.get(seatNumber);
                  const isSelected = selectedMap.has(seatNumber);
                  const isMine = highlightSet.has(seatNumber);
                  const canSelect = !readonly && !isBooked && Boolean(onToggle);

                  let label = `${seatNumber} available`;
                  if (isBooked && isMine) label = `${seatNumber} my seat (${bookedCategory})`;
                  else if (isBooked) label = `${seatNumber} booked ${bookedCategory}`;
                  else if (isSelected) label = `${seatNumber} selected ${selectedCategory}`;

                  return (
                    <button
                      key={seatNumber}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={isSelected || isMine}
                      disabled={!canSelect && !readonly}
                      onClick={() => handleToggle(seatNumber)}
                      className={cn(
                        'aspect-square w-full touch-manipulation select-none rounded-[4px] border font-bold transition active:scale-90 sm:rounded-md',
                        'flex items-center justify-center',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal',
                        seatLabelClass,
                        // My seats (view booking) — strongest highlight
                        isBooked &&
                          isMine &&
                          bookedCategory === 'OWNER' &&
                          'cursor-default border-gold bg-gold text-ink ring-2 ring-teal ring-offset-1',
                        isBooked &&
                          isMine &&
                          bookedCategory !== 'OWNER' &&
                          'cursor-default border-teal bg-teal text-white ring-2 ring-ink/30 ring-offset-1',
                        // Other booked
                        isBooked &&
                          !isMine &&
                          bookedCategory === 'OWNER' &&
                          'cursor-default border-gold/40 bg-gold/30 text-warn',
                        isBooked &&
                          !isMine &&
                          bookedCategory !== 'OWNER' &&
                          'cursor-default border-sky/40 bg-sky/25 text-sky',
                        // Selected while booking
                        !isBooked &&
                          isSelected &&
                          selectedCategory === 'OWNER' &&
                          'border-gold bg-gold text-ink shadow-sm',
                        !isBooked &&
                          isSelected &&
                          selectedCategory !== 'OWNER' &&
                          'border-sky bg-sky text-white shadow-sm',
                        // Available
                        !isBooked &&
                          !isSelected &&
                          canSelect &&
                          'border-line bg-surface text-ink active:border-sky active:bg-sky/10',
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

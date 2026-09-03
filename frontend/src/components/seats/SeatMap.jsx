import { useMemo } from 'react';
import { cn } from '../../utils/format';

export function SeatLegend({ mode = 'book' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-muted sm:gap-x-4 sm:text-xs">
      <LegendSwatch className="border-line bg-surface" label="Available" />
      {mode === 'book' && (
        <>
          <LegendSwatch className="border-sky bg-sky text-white" label="Selected guest" />
          <LegendSwatch className="border-gold bg-gold text-ink" label="Selected owner" />
          <LegendSwatch className="border-sky/40 bg-sky/25 text-sky" label="Guest booked" />
          <LegendSwatch className="border-gold/50 bg-gold/30 text-warn" label="Owner booked" />
        </>
      )}
      {mode === 'view' && (
        <>
          <LegendSwatch className="border-teal ring-2 ring-teal bg-teal text-white" label="My seats" />
          <LegendSwatch className="border-sky/40 bg-sky/25 text-sky" label="Guest booked" />
          <LegendSwatch className="border-gold/50 bg-gold/30 text-warn" label="Owner booked" />
        </>
      )}
      {mode === 'manage' && (
        <>
          <LegendSwatch className="border-danger/50 bg-danger text-white" label="Booked, not allotted" />
          <LegendSwatch className="border-ink/20 bg-ink/20 text-ink/40" label="Allotted" />
        </>
      )}
    </div>
  );
}

function LegendSwatch({ className, label }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span
        className={cn('inline-block h-3.5 w-3.5 shrink-0 rounded-sm border sm:h-4 sm:w-4', className)}
        aria-hidden
      />
      <span className="leading-tight">{label}</span>
    </span>
  );
}

/**
 * selected: string[] OR [{ seatNumber, category }]
 * highlightSeats: string[] — my booking seats (view mode)
 * activeCategory: GUEST | OWNER — color for newly selected seats
 * mode: book | view | manage
 *   manage: pending booked = red, allotted = gray disabled
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
    <div className="w-full min-w-0 touch-pan-y space-y-3 overflow-visible sm:space-y-4">
      <div className="px-4 sm:px-10">
        <div className="cinema-screen py-2 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-muted sm:py-2.5 sm:text-[10px]">
          Screen this way
        </div>
      </div>

      <SeatLegend mode={mode} />

      <div className="w-full min-w-0 space-y-1 sm:space-y-1.5">
        {rowKeys.map((row) => {
          const byColumn = new Map(rows[row].map((seat) => [seat.column, seat]));

          return (
            <div key={row} className="flex w-full min-w-0 items-center gap-1 sm:gap-1.5">
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
                  const isAllotted =
                    isBooked && String(seat.checkInStatus || '').toUpperCase() === 'CHECKED_IN';
                  const isPendingAllot = isBooked && !isAllotted;
                  const bookedCategory = String(seat.category || 'GUEST').toUpperCase();
                  const selectedCategory = selectedMap.get(seatNumber);
                  const isSelected = selectedMap.has(seatNumber);
                  const isMine = highlightSet.has(seatNumber);
                  const canSelect = !readonly && !isBooked && Boolean(onToggle);
                  const interactive = mode !== 'manage' && canSelect;
                  const SeatEl = interactive ? 'button' : 'div';

                  let label = `${seatNumber} available`;
                  if (mode === 'manage' && isAllotted) label = `${seatNumber} allotted`;
                  else if (mode === 'manage' && isPendingAllot)
                    label = `${seatNumber} booked — not allotted`;
                  else if (isBooked && isMine) label = `${seatNumber} my seat (${bookedCategory})`;
                  else if (isBooked) label = `${seatNumber} booked ${bookedCategory}`;
                  else if (isSelected) label = `${seatNumber} selected ${selectedCategory}`;

                  return (
                    <SeatEl
                      key={seatNumber}
                      {...(interactive
                        ? {
                            type: 'button',
                            'aria-pressed': isSelected || isMine,
                            onClick: () => handleToggle(seatNumber),
                          }
                        : {
                            role: 'img',
                          })}
                      title={label}
                      aria-label={label}
                      className={cn(
                        'flex aspect-square w-full select-none items-center justify-center rounded-[4px] border font-bold sm:rounded-md',
                        interactive &&
                          'touch-pan-y transition active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal',
                        seatLabelClass,
                        // Manage allotment view
                        mode === 'manage' &&
                          !isBooked &&
                          'cursor-default border-line bg-surface text-ink',
                        mode === 'manage' &&
                          isPendingAllot &&
                          'cursor-default border-danger/60 bg-danger text-white shadow-sm',
                        mode === 'manage' &&
                          isAllotted &&
                          'cursor-not-allowed border-ink/15 bg-ink/15 text-ink/35 line-through',
                        // Booking detail "my seats"
                        mode !== 'manage' &&
                          isBooked &&
                          isMine &&
                          bookedCategory === 'OWNER' &&
                          'cursor-default border-gold bg-gold text-ink ring-2 ring-teal ring-offset-1',
                        mode !== 'manage' &&
                          isBooked &&
                          isMine &&
                          bookedCategory !== 'OWNER' &&
                          'cursor-default border-teal bg-teal text-white ring-2 ring-ink/30 ring-offset-1',
                        // Other booked (book/view)
                        mode !== 'manage' &&
                          isBooked &&
                          !isMine &&
                          bookedCategory === 'OWNER' &&
                          'cursor-default border-gold/40 bg-gold/30 text-warn',
                        mode !== 'manage' &&
                          isBooked &&
                          !isMine &&
                          bookedCategory !== 'OWNER' &&
                          'cursor-default border-sky/40 bg-sky/25 text-sky',
                        // Selected while booking
                        mode !== 'manage' &&
                          !isBooked &&
                          isSelected &&
                          selectedCategory === 'OWNER' &&
                          'border-gold bg-gold text-ink shadow-sm',
                        mode !== 'manage' &&
                          !isBooked &&
                          isSelected &&
                          selectedCategory !== 'OWNER' &&
                          'border-sky bg-sky text-white shadow-sm',
                        // Available (book/view)
                        mode !== 'manage' &&
                          !isBooked &&
                          !isSelected &&
                          canSelect &&
                          'border-line bg-surface text-ink active:border-sky active:bg-sky/10',
                        mode !== 'manage' &&
                          !isBooked &&
                          !isSelected &&
                          !canSelect &&
                          'border-line bg-surface text-ink'
                      )}
                    >
                      <span className="sm:hidden">{column}</span>
                      <span className="hidden sm:inline">{seatNumber}</span>
                    </SeatEl>
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

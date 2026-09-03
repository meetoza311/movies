import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export default function TicketView({ booking, onClose }) {
  if (!booking) return null;

  const movie = booking.movieId;
  const show = booking.showId;
  const seats = (booking.seats || []).map((s) => s.seatNumber).join(', ');

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]">
      <div className="no-print absolute inset-0" onClick={onClose} />
      <div className="ticket-print relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="bg-gradient-to-r from-teal to-ink px-6 py-5 text-center text-white">
          <p className="text-2xl font-extrabold tracking-wide">
            Savan <span className="text-gold">Sentosa</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/60">Admission Ticket</p>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm">
          <Row label="Movie" value={typeof movie === 'object' ? movie.title : '—'} />
          <Row label="Date" value={formatDate(show?.showDate)} />
          <Row label="Time" value={formatTime(show?.startTime)} />
          <Row label="Customer" value={booking.customerName} />
          <Row label="Mobile" value={booking.mobileNumber} />
          <Row label="Seats" value={seats} />
          <Row
            label="Price"
            value={`${formatCurrency(booking.seatPrice)} × ${booking.numberOfSeats}`}
          />
          <div className="rounded-xl bg-paper px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
            <p className="text-2xl font-extrabold text-teal">
              {formatCurrency(booking.totalAmount)}
            </p>
          </div>
          <Row label="Booking ID" value={booking.bookingNumber} />
          <div className="flex items-center justify-between">
            <span className="text-muted">Status</span>
            <Badge tone={booking.bookingStatus}>{booking.bookingStatus}</Badge>
          </div>
        </div>

        <div className="no-print flex gap-2 border-t border-line px-6 py-4">
          <Button className="flex-1" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            Print Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bookingApi } from '../services/bookingApi';
import { showApi } from '../services/showApi';
import SeatMap from '../components/seats/SeatMap';
import TicketView from '../components/bookings/TicketView';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/Modal';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showTicket, setShowTicket] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
  });

  const booking = data?.data;
  const showId = booking?.showId?._id || booking?.showId;

  const seatsQuery = useQuery({
    queryKey: ['seats', showId],
    queryFn: () => showApi.seats(showId),
    enabled: Boolean(showId && editing),
  });

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName);
      setMobileNumber(booking.mobileNumber);
      setSelectedSeats(
        (booking.seats || []).map((s) => String(s.seatNumber).toUpperCase().trim())
      );
    }
  }, [booking]);

  const updateMutation = useMutation({
    mutationFn: (payload) => bookingApi.update(id, payload),
    onSuccess: () => {
      toast.success('Booking updated');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['seats', showId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled');
      setCancelOpen(false);
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => bookingApi.remove(id),
    onSuccess: () => {
      toast.success('Booking deleted');
      navigate('/bookings');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const movie = booking.movieId;
  const show = booking.showId;

  function toggleSeat(seatNumber) {
    const next = String(seatNumber).toUpperCase().trim();
    setSelectedSeats((prev) =>
      prev.includes(next)
        ? prev.filter((s) => s !== next)
        : [...prev, next]
    );
  }

  // When editing, treat current booking seats as selectable even if BOOKED
  const editableSeats = (seatsQuery.data?.data?.seats || []).map((seat) => {
    const seatNumber = String(seat.seatNumber).toUpperCase().trim();
    if (
      seat.status === 'BOOKED' &&
      selectedSeats.includes(seatNumber) &&
      String(seat.bookingId) === String(booking._id)
    ) {
      return { ...seat, seatNumber, status: 'AVAILABLE' };
    }
    if (
      seat.status === 'BOOKED' &&
      (booking.seats || []).some(
        (s) => String(s.seatNumber).toUpperCase().trim() === seatNumber
      ) &&
      String(seat.bookingId) === String(booking._id)
    ) {
      return { ...seat, seatNumber, status: 'AVAILABLE' };
    }
    return { ...seat, seatNumber };
  });

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        subtitle="Booking details and ticket"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowTicket(true)}>
              Print Ticket
            </Button>
            {booking.bookingStatus === 'CONFIRMED' && !editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">
              {typeof movie === 'object' ? movie.title : 'Movie'}
            </h2>
            <Badge tone={booking.bookingStatus}>{booking.bookingStatus}</Badge>
          </div>
          <p className="text-sm text-muted">
            {formatDate(show?.showDate)} · {formatTime(show?.startTime)}
          </p>

          {!editing ? (
            <div className="space-y-2 text-sm">
              <Row label="Customer" value={booking.customerName} />
              <Row label="Mobile" value={booking.mobileNumber} />
              <Row
                label="Seats"
                value={(booking.seats || []).map((s) => s.seatNumber).join(', ')}
              />
              <Row
                label="Price"
                value={`${formatCurrency(booking.seatPrice)} × ${booking.numberOfSeats}`}
              />
              <Row label="Total" value={formatCurrency(booking.totalAmount)} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  label="Mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
              {seatsQuery.isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <SeatMap
                  seats={editableSeats}
                  selected={selectedSeats}
                  onToggle={toggleSeat}
                />
              )}
              <p className="text-sm">
                Live total:{' '}
                <strong>
                  {formatCurrency((show?.seatPrice || booking.seatPrice) * selectedSeats.length)}
                </strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel edit
                </Button>
                <Button
                  loading={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      customerName,
                      mobileNumber,
                      seats: selectedSeats,
                    })
                  }
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="font-display text-lg font-bold">Actions</h3>
          <Link to={`/shows/${showId}`}>
            <Button variant="outline" className="w-full">
              Open show
            </Button>
          </Link>
          {booking.bookingStatus === 'CONFIRMED' && (
            <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(true)}>
              Cancel Booking
            </Button>
          )}
          <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
            Delete Permanently
          </Button>
        </div>
      </div>

      {showTicket && <TicketView booking={booking} onClose={() => setShowTicket(false)} />}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Booking"
        confirmLabel="Cancel Booking"
        danger
        loading={cancelMutation.isPending}
        message="Booking status will become CANCELLED and seats will be released."
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Permanently"
        confirmLabel="Delete Permanently"
        danger
        loading={deleteMutation.isPending}
        message="This permanently removes the booking record."
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-line py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

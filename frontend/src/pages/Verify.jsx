import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, QrCode, ScanLine, XCircle } from 'lucide-react';
import { showApi } from '../services/showApi';
import { bookingApi } from '../services/bookingApi';
import { PageHeader, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

function seatSummary(seats = []) {
  return seats
    .map((s) => {
      const cat = String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'O' : 'G';
      return `${s.seatNumber}(${cat})`;
    })
    .join(', ');
}

export default function Verify() {
  const qc = useQueryClient();
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const lastScanRef = useRef('');
  const scanLockRef = useRef(false);

  const [showId, setShowId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);

  const showsQuery = useQuery({
    queryKey: ['shows', { status: 'scheduled', limit: 50 }],
    queryFn: () => showApi.list({ status: 'scheduled', limit: 50 }),
  });

  const gateQuery = useQuery({
    queryKey: ['gate', showId],
    queryFn: () => bookingApi.gateList(showId),
    enabled: Boolean(showId),
    refetchInterval: showId ? 8000 : false,
  });

  const shows = showsQuery.data?.data || [];
  const selectedShow = useMemo(
    () => shows.find((s) => s._id === showId),
    [shows, showId]
  );

  const stopScanner = useCallback(async () => {
    const ctrl = html5QrRef.current;
    html5QrRef.current = null;
    setScanning(false);
    if (!ctrl) return;
    try {
      if (ctrl.isScanning) await ctrl.stop();
      await ctrl.clear();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => () => {
    stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    // Restart scanner context when show changes
    stopScanner();
    setResults([]);
    lastScanRef.current = '';
  }, [showId, stopScanner]);

  function dismissResult(id) {
    setResults((prev) => prev.filter((item) => item.id !== id));
    toast.dismiss(id);
  }

  function pushResult(item) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = { id, createdAt: Date.now(), ...item };
    setResults((prev) => [next, ...prev].slice(0, 8));
    window.setTimeout(() => {
      setResults((prev) => prev.filter((r) => r.id !== id));
    }, 30_000);
    return id;
  }

  async function startScanner() {
    if (!showId) {
      toast.error('Select a show first');
      return;
    }
    if (scanning) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopScanner();
      const ctrl = new Html5Qrcode('gate-qr-reader');
      html5QrRef.current = ctrl;
      setScanning(true);

      await ctrl.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          const code = String(decoded || '').trim();
          if (!code || scanLockRef.current) return;
          if (code === lastScanRef.current) return;
          lastScanRef.current = code;
          scanLockRef.current = true;
          try {
            await runCheckIn(code, 'SCAN');
          } finally {
            setTimeout(() => {
              scanLockRef.current = false;
            }, 2500);
          }
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      toast.error(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Use manual allot below.'
          : 'Could not start camera. Use manual allot.'
      );
    }
  }

  async function runCheckIn(code, method) {
    if (!showId) {
      toast.error('Select a show first');
      return;
    }
    if (!code?.trim()) {
      toast.error('Enter or scan a ticket code');
      return;
    }

    setBusy(true);
    try {
      const res = await bookingApi.gateCheckIn({
        code: code.trim(),
        showId,
        method,
      });
      const toastId = pushResult({
        type: 'success',
        booking: res.data,
        message: res.message,
      });
      toast.success(`Ticket allotted: ${res.data.bookingNumber}`, {
        id: toastId,
        duration: 30_000,
      });
      setManualCode('');
      qc.invalidateQueries({ queryKey: ['gate', showId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      const booking = err.data?.data || null;
      if (err.errorCode === 'ALREADY_CHECKED_IN') {
        const toastId = pushResult({
          type: 'already',
          booking,
          message: err.message || 'Already scanned',
        });
        toast.error(
          `Already scanned / allotted: ${booking?.bookingNumber || code.trim()}`,
          { id: toastId, duration: 30_000 }
        );
      } else if (err.errorCode === 'WRONG_SHOW') {
        const toastId = pushResult({ type: 'error', booking, message: err.message });
        toast.error(err.message, { id: toastId, duration: 30_000 });
      } else if (err.errorCode === 'BOOKING_CANCELLED') {
        const toastId = pushResult({ type: 'error', booking, message: err.message });
        toast.error(err.message, { id: toastId, duration: 30_000 });
      } else {
        const toastId = pushResult({
          type: 'error',
          booking: null,
          message: err.message,
        });
        toast.error(err.message || 'Verify failed', { id: toastId, duration: 30_000 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleManual(e) {
    e.preventDefault();
    await runCheckIn(manualCode, 'MANUAL');
  }

  const meta = gateQuery.data?.meta || { total: 0, pending: 0, checkedIn: 0 };
  const gateBookings = gateQuery.data?.data || [];

  return (
    <div className="mx-auto min-w-0 max-w-5xl">
      <PageHeader
        title="Verify / Scanner"
        subtitle="Scan QR or enter booking code — show-wise entry allotment"
      />

      <div className="mb-4 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
        <Select
          label="Select show (required)"
          value={showId}
          onChange={(e) => setShowId(e.target.value)}
        >
          <option value="">Choose show to verify</option>
          {shows.map((s) => (
            <option key={s._id} value={s._id}>
              {(typeof s.movieId === 'object' ? s.movieId.title : 'Movie') +
                ` · ${formatDate(s.showDate)} ${formatTime(s.startTime)}`}
            </option>
          ))}
        </Select>
        {selectedShow && (
          <p className="mt-2 text-xs text-muted">
            Verifying for{' '}
            <strong>
              {typeof selectedShow.movieId === 'object'
                ? selectedShow.movieId.title
                : 'Movie'}
            </strong>{' '}
            · {formatDate(selectedShow.showDate)} · {formatTime(selectedShow.startTime)}
          </p>
        )}
      </div>

      {!showId ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center text-sm text-muted">
          Select a show to start scanning or manual allotment.
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <ScanLine size={18} /> Camera scan
                </h2>
                {scanning ? (
                  <Button size="sm" variant="outline" onClick={stopScanner}>
                    Stop camera
                  </Button>
                ) : (
                  <Button size="sm" onClick={startScanner} disabled={busy}>
                    <QrCode size={16} /> Start camera
                  </Button>
                )}
              </div>
              <div
                id="gate-qr-reader"
                ref={scannerRef}
                className="overflow-hidden rounded-xl border border-line bg-ink/5 min-h-[220px]"
              />
              <p className="mt-2 text-center text-[11px] text-muted">
                Point phone camera at the ticket QR. HTTPS required for camera.
              </p>
            </div>

            <form
              onSubmit={handleManual}
              className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <h2 className="font-display text-lg font-bold">Manual allot</h2>
              <p className="text-xs text-muted">
                If scanner fails, type booking number or scan code from the ticket.
              </p>
              <Input
                label="Booking number or scan code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. SS-… or scan token"
                autoComplete="off"
              />
              <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                Allot ticket
              </Button>
            </form>

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => dismissResult(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left shadow-sm ${
                      item.type === 'success'
                        ? 'border-success/30 bg-success/5'
                        : item.type === 'already'
                          ? 'border-warn/40 bg-gold-soft'
                          : 'border-danger/30 bg-danger/5'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'success' ? (
                          <CheckCircle2 className="text-success" size={22} />
                        ) : (
                          <XCircle
                            className={item.type === 'already' ? 'text-warn' : 'text-danger'}
                            size={22}
                          />
                        )}
                        <p className="font-bold text-ink">
                          {item.type === 'success'
                            ? 'Allotted'
                            : item.type === 'already'
                              ? 'Already scanned'
                              : 'Not valid'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted">Tap to close</span>
                    </div>
                    <p className="text-sm text-muted">{item.message}</p>
                    {item.booking && (
                      <div className="mt-3 space-y-1 text-sm">
                        <p>
                          <strong>{item.booking.bookingNumber}</strong> ·{' '}
                          {item.booking.customerName}
                        </p>
                        <p className="text-xs font-semibold text-muted">
                          Ticket ID: {item.booking.bookingNumber}
                        </p>
                        <p className="text-muted">{item.booking.mobileNumber}</p>
                        <p className="break-words">
                          Seats: {seatSummary(item.booking.seats)}
                        </p>
                        <p className="font-semibold text-teal">
                          {formatCurrency(item.booking.totalAmount)}
                        </p>
                        {item.booking.checkedInAt && (
                          <p className="text-xs text-muted">
                            Checked in:{' '}
                            {new Date(item.booking.checkedInAt).toLocaleString('en-IN')}
                            {item.booking.checkInMethod
                              ? ` · ${item.booking.checkInMethod}`
                              : ''}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted">
                      Hides in 30 seconds, or tap to remove now.
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Show entry list</h2>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="rounded-full bg-success/10 px-2 py-1 text-success">
                  In {meta.checkedIn}
                </span>
                <span className="rounded-full bg-line px-2 py-1 text-muted">
                  Pending {meta.pending}
                </span>
              </div>
            </div>

            {gateQuery.isLoading && <Skeleton className="h-40" />}
            {!gateQuery.isLoading && gateBookings.length === 0 && (
              <p className="text-sm text-muted">No bookings for this show yet.</p>
            )}

            <div className="space-y-2 lg:max-h-[28rem] lg:overflow-y-auto">
              {gateBookings.map((b) => (
                <div
                  key={b._id}
                  className="rounded-xl border border-line px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{b.bookingNumber}</p>
                      <p className="truncate text-muted">
                        {b.customerName} · {b.mobileNumber}
                      </p>
                      <p className="break-words text-xs text-muted">
                        {seatSummary(b.seats)}
                      </p>
                    </div>
                    <Badge
                      tone={b.checkInStatus === 'CHECKED_IN' ? 'CONFIRMED' : 'scheduled'}
                    >
                      {b.checkInStatus === 'CHECKED_IN' ? 'Allotted' : 'Pending'}
                    </Badge>
                  </div>
                  {b.checkInStatus !== 'CHECKED_IN' && b.bookingStatus === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={busy}
                      onClick={() =>
                        runCheckIn(b.scanToken || b.bookingNumber, 'MANUAL')
                      }
                    >
                      Allot manually
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

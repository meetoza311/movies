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
import { Modal } from '../components/common/Modal';
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
  const modalOpenRef = useRef(false);
  const showIdRef = useRef('');

  const [showId, setShowId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);

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

  useEffect(() => {
    showIdRef.current = showId;
  }, [showId]);

  useEffect(() => {
    modalOpenRef.current = Boolean(scanResult);
  }, [scanResult]);

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
    stopScanner();
    setScanResult(null);
    lastScanRef.current = '';
    scanLockRef.current = false;
  }, [showId, stopScanner]);

  function closeScanResult() {
    modalOpenRef.current = false;
    setScanResult(null);
    lastScanRef.current = '';
    scanLockRef.current = false;
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
        { fps: 20, qrbox: { width: 220, height: 220 }, disableFlip: false },
        async (decoded) => {
          const code = String(decoded || '').trim();
          if (!code || scanLockRef.current || modalOpenRef.current) return;
          if (code === lastScanRef.current) return;
          lastScanRef.current = code;
          scanLockRef.current = true;
          try {
            await runCheckIn(code, 'SCAN');
          } catch {
            scanLockRef.current = false;
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
    const activeShowId = showIdRef.current || showId;
    if (!activeShowId) {
      toast.error('Select a show first');
      scanLockRef.current = false;
      return;
    }
    if (!code?.trim()) {
      toast.error('Enter or scan a ticket code');
      scanLockRef.current = false;
      return;
    }

    setBusy(true);
    try {
      const res = await bookingApi.gateCheckIn({
        code: code.trim(),
        showId: activeShowId,
        method,
      });
      setManualCode('');
      modalOpenRef.current = true;
      setScanResult({
        type: 'success',
        booking: res.data,
        message: res.message || 'Ticket allotted',
      });
      qc.invalidateQueries({ queryKey: ['gate', activeShowId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      const booking = err.data?.data || null;
      modalOpenRef.current = true;
      if (err.errorCode === 'ALREADY_CHECKED_IN') {
        setScanResult({
          type: 'already',
          booking,
          message: err.message || 'This ticket is already allotted',
        });
      } else {
        setScanResult({
          type: 'error',
          booking,
          message: err.message || 'Verify failed',
        });
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
            <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-bold sm:text-lg">
                  <ScanLine size={18} className="shrink-0" /> Camera scan
                </h2>
                {scanning ? (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={stopScanner}>
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" className="shrink-0" onClick={startScanner} disabled={busy}>
                    <QrCode size={16} /> Start
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

      <ScanResultModal result={scanResult} onClose={closeScanResult} />
    </div>
  );
}

function ScanResultModal({ result, onClose }) {
  const type = result?.type;
  const booking = result?.booking;
  const isSuccess = type === 'success';
  const isAlready = type === 'already';

  return (
    <Modal
      open={Boolean(result)}
      title={isSuccess ? 'Allotted' : isAlready ? 'Already allotted' : 'Not valid'}
      onClose={onClose}
      footerClassName="flex-col"
      footer={
        <Button className="w-full min-h-12" size="lg" onClick={onClose}>
          OK
        </Button>
      }
    >
      <div className="space-y-3 text-center sm:space-y-4">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ${
            isSuccess ? 'bg-success/15' : isAlready ? 'bg-gold-soft' : 'bg-danger/10'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="text-success" size={36} />
          ) : (
            <XCircle className={isAlready ? 'text-warn' : 'text-danger'} size={36} />
          )}
        </div>
        <div className="px-1">
          <p
            className={`text-xl font-extrabold leading-tight sm:text-2xl ${
              isSuccess ? 'text-success' : isAlready ? 'text-warn' : 'text-danger'
            }`}
          >
            {isSuccess ? 'Allotted' : isAlready ? 'Already allotted' : 'Not valid'}
          </p>
          {result?.message && (
            <p className="mt-1 break-words text-sm text-muted">{result.message}</p>
          )}
        </div>
        {booking && (
          <div className="rounded-2xl border border-line bg-paper px-3.5 py-3 text-left text-sm text-ink sm:px-4">
            <p className="break-all text-base font-extrabold sm:text-lg">
              {booking.bookingNumber}
            </p>
            <p className="mt-1 break-words font-semibold">{booking.customerName}</p>
            {booking.mobileNumber && (
              <p className="break-all text-muted">{booking.mobileNumber}</p>
            )}
            <p className="mt-2 break-words font-semibold">
              Seats: {seatSummary(booking.seats)}
            </p>
            {booking.totalAmount != null && (
              <p className="mt-1 font-bold text-teal">
                {formatCurrency(booking.totalAmount)}
              </p>
            )}
            {booking.checkedInAt && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Checked in {new Date(booking.checkedInAt).toLocaleString('en-IN')}
                {booking.checkInMethod ? ` · ${booking.checkInMethod}` : ''}
              </p>
            )}
          </div>
        )}
        <p className="px-1 text-xs text-muted">Press OK, then scan the next ticket.</p>
      </div>
    </Modal>
  );
}

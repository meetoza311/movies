import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, MessageCircle, Printer, Share2, X } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export default function TicketView({ booking, onClose }) {
  const ticketRef = useRef(null);
  const [busy, setBusy] = useState(null);

  if (!booking) return null;

  const movie = booking.movieId;
  const show = booking.showId;
  const movieTitle = typeof movie === 'object' ? movie.title : 'Movie';
  const seats = (booking.seats || []).map((s) => s.seatNumber).join(', ');
  const fileName = `Savan-Sentosa-${booking.bookingNumber || 'ticket'}.pdf`;

  const shareText = [
    `*Savan Sentosa* — Admission Ticket`,
    `Movie: ${movieTitle}`,
    `Date: ${formatDate(show?.showDate)}`,
    `Time: ${formatTime(show?.startTime)}`,
    `Customer: ${booking.customerName}`,
    `Seats: ${seats}`,
    `Total: ${formatCurrency(booking.totalAmount)}`,
    `Booking ID: ${booking.bookingNumber}`,
  ].join('\n');

  async function buildPdfBlob() {
    const node = ticketRef.current;
    if (!node) throw new Error('Ticket not ready');

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const renderWidth = canvas.width * ratio;
    const renderHeight = canvas.height * ratio;
    const x = (pageWidth - renderWidth) / 2;
    const y = margin;

    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
    return pdf.output('blob');
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function withBusy(key, fn) {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast.error(err?.message || 'Could not prepare ticket PDF');
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    await withBusy('download', async () => {
      const blob = await buildPdfBlob();
      downloadBlob(blob, fileName);
      toast.success('PDF saved to your device');
    });
  }

  async function handleShare() {
    await withBusy('share', async () => {
      const blob = await buildPdfBlob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ticket ${booking.bookingNumber}`,
          text: shareText,
        });
        return;
      }

      if (navigator.share) {
        downloadBlob(blob, fileName);
        await navigator.share({
          title: `Ticket ${booking.bookingNumber}`,
          text: `${shareText}\n\n(PDF also downloaded — attach it if needed)`,
        });
        return;
      }

      downloadBlob(blob, fileName);
      toast.success('PDF downloaded — share it from your files');
    });
  }

  async function handleWhatsApp() {
    await withBusy('whatsapp', async () => {
      const blob = await buildPdfBlob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Mobile: system share sheet usually lists WhatsApp and can attach the PDF
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ticket ${booking.bookingNumber}`,
          text: shareText,
        });
        return;
      }

      // Desktop / unsupported file share: download PDF + open WhatsApp with text
      downloadBlob(blob, fileName);
      const url = `https://wa.me/?text=${encodeURIComponent(
        `${shareText}\n\n📎 Ticket PDF downloaded — attach ${fileName} in WhatsApp.`
      )}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('PDF downloaded — attach it in WhatsApp');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="no-print absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
        <div className="no-print flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-bold text-ink">Ticket ready</p>
            <p className="text-xs text-muted">Download, share, or print</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line p-2 text-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div ref={ticketRef} className="ticket-print bg-white">
            <div className="bg-gradient-to-r from-teal to-ink px-6 py-5 text-center text-white">
              <p className="text-2xl font-extrabold tracking-wide">
                Savan <span className="text-gold">Sentosa</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/60">
                Admission Ticket
              </p>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <Row label="Movie" value={movieTitle} />
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
          </div>
        </div>

        <div className="no-print space-y-2 border-t border-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={Boolean(busy)}
              loading={busy === 'download'}
              onClick={handleDownload}
            >
              <Download size={16} /> Download PDF
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={Boolean(busy)}
              loading={busy === 'share'}
              onClick={handleShare}
            >
              <Share2 size={16} /> Share
            </Button>
            <Button
              className="w-full"
              disabled={Boolean(busy)}
              loading={busy === 'whatsapp'}
              onClick={handleWhatsApp}
            >
              <MessageCircle size={16} /> WhatsApp
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={Boolean(busy)}
              onClick={handlePrint}
            >
              <Printer size={16} /> Print
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={onClose} disabled={Boolean(busy)}>
            Close
          </Button>
          <p className="text-center text-[11px] text-muted">
            PDF is created on this device — nothing is uploaded to the server.
          </p>
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

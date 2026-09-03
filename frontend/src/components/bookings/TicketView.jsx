import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, MessageCircle, Printer, Share2, X } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

/** jsPDF Helvetica cannot draw ₹ / × / · — use ASCII-safe strings in PDF only */
function pdfMoney(amount) {
  const n = Number(amount) || 0;
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

function pdfSafe(text) {
  return String(text ?? '')
    .replace(/₹/g, 'Rs. ')
    .replace(/×/g, 'x')
    .replace(/·/g, '|')
    .replace(/—|–/g, '-')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function seatLinesFromBooking(booking) {
  return (booking.seats || []).map((s) => {
    const cat = String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'Owner' : 'Guest';
    const price =
      s.price != null
        ? formatCurrency(s.price)
        : formatCurrency(
            cat === 'Owner'
              ? booking.ownerPrice ?? 50
              : booking.guestPrice ?? booking.seatPrice ?? 80
          );
    return `${s.seatNumber} (${cat} ${price})`;
  });
}

function ensureSpace(pdf, y, need, margin) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + need <= pageHeight - margin) return y;
  pdf.addPage();
  return margin;
}

export default function TicketView({ booking, onClose }) {
  const [busy, setBusy] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const movie = booking?.movieId;
  const show = booking?.showId;
  const movieTitle = typeof movie === 'object' ? movie.title : 'Movie';
  const seatLines = useMemo(() => (booking ? seatLinesFromBooking(booking) : []), [booking]);
  const seatsText = seatLines.join(', ') || '—';
  const guestCount = (booking?.seats || []).filter(
    (s) => String(s.category || 'GUEST').toUpperCase() !== 'OWNER'
  ).length;
  const ownerCount = (booking?.seats || []).filter(
    (s) => String(s.category || '').toUpperCase() === 'OWNER'
  ).length;
  const fileName = `Savan-Sentosa-${booking?.bookingNumber || 'ticket'}.pdf`;
  const scanPayload = booking?.scanToken
    ? `SS:${booking.scanToken}`
    : booking?.bookingNumber || '';

  useEffect(() => {
    let cancelled = false;
    async function makeQr() {
      if (!scanPayload) {
        setQrDataUrl('');
        return;
      }
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(scanPayload, {
          width: 280,
          margin: 1,
          color: { dark: '#1a1040', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl('');
      }
    }
    makeQr();
    return () => {
      cancelled = true;
    };
  }, [scanPayload]);

  if (!booking) return null;

  const shareText = [
    `*Savan Sentosa* — Admission Ticket`,
    `Movie: ${movieTitle}`,
    `Date: ${formatDate(show?.showDate)}`,
    `Time: ${formatTime(show?.startTime)}`,
    `Customer: ${booking.customerName}`,
    `Seats: ${seatsText}`,
    `Guest: ${guestCount} · Owner: ${ownerCount}`,
    `Total: ${formatCurrency(booking.totalAmount)}`,
    `Booking ID: ${booking.bookingNumber}`,
    booking.scanToken ? `Scan code: ${booking.scanToken}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  async function buildPdfBlob() {
    const [{ jsPDF }, QRCode] = await Promise.all([
      import('jspdf'),
      import('qrcode').then((m) => m.default),
    ]);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const labelW = 38;
    const valueW = contentWidth - labelW - 4;
    let y = margin;

    function drawHeader() {
      pdf.setFillColor(26, 16, 64);
      pdf.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F');
      pdf.setFillColor(225, 29, 72);
      pdf.rect(margin, y + 33, contentWidth, 3, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('Savan Sentosa', pageWidth / 2, y + 14, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(253, 224, 71);
      pdf.text('CINEMA ADMISSION TICKET', pageWidth / 2, y + 22, { align: 'center' });

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(pdfSafe(booking.bookingNumber || ''), pageWidth / 2, y + 30, {
        align: 'center',
      });

      y += 44;
    }

    function drawField(label, value, opts = {}) {
      const fontSize = opts.fontSize || 11;
      const lineH = opts.lineH || 5.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const valueLines = pdf.splitTextToSize(pdfSafe(value), valueW);
      const blockH = Math.max(lineH + 2, valueLines.length * lineH + 4);
      y = ensureSpace(pdf, y, blockH + 4, margin);

      pdf.setTextColor(120, 113, 108);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(pdfSafe(label).toUpperCase(), margin, y + 4);

      pdf.setTextColor(26, 16, 64);
      pdf.setFont('helvetica', opts.boldValue === false ? 'normal' : 'bold');
      pdf.setFontSize(fontSize);
      pdf.text(valueLines, margin + labelW, y + 4);

      y += blockH;
      pdf.setDrawColor(245, 200, 150);
      pdf.setLineWidth(0.25);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 4;
    }

    drawHeader();

    // Movie title card
    y = ensureSpace(pdf, y, 24, margin);
    pdf.setFillColor(255, 247, 237);
    const titleLines = pdf.splitTextToSize(pdfSafe(movieTitle || 'Movie'), contentWidth - 8);
    const titleBoxH = Math.max(18, titleLines.length * 7 + 8);
    pdf.roundedRect(margin, y, contentWidth, titleBoxH, 2, 2, 'F');
    pdf.setTextColor(26, 16, 64);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(titleLines, pageWidth / 2, y + 8, { align: 'center' });
    y += titleBoxH + 6;

    // Date / time strip
    y = ensureSpace(pdf, y, 14, margin);
    const when = pdfSafe(
      `${formatDate(show?.showDate)}  |  ${formatTime(show?.startTime)}${
        show?.endTime ? ` - ${formatTime(show.endTime)}` : ''
      }`
    );
    pdf.setFillColor(26, 16, 64);
    pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(when, pageWidth / 2, y + 8, { align: 'center' });
    y += 18;

    drawField('Customer', booking.customerName || '-');
    drawField('Mobile', booking.mobileNumber || '-');

    // Seats as wrapped list (readable when many)
    const seatNums = (booking.seats || []).map((s) => {
      const cat = String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'O' : 'G';
      return `${String(s.seatNumber).toUpperCase()}(${cat})`;
    });
    const seatsDisplay =
      seatNums.length === 0
        ? '-'
        : seatNums.join(', ');
    drawField('Seats', seatsDisplay, { fontSize: 10, lineH: 5 });

    drawField(
      'Guest',
      `${guestCount} x ${pdfMoney(booking.guestPrice ?? booking.seatPrice ?? 80)}`
    );
    drawField('Owner', `${ownerCount} x ${pdfMoney(booking.ownerPrice ?? 50)}`);
    drawField(
      'Entry',
      booking.checkInStatus === 'CHECKED_IN' ? 'Already allotted' : 'Valid for entry'
    );

    // Total bar
    y = ensureSpace(pdf, y, 24, margin);
    pdf.setFillColor(225, 29, 72);
    pdf.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('TOTAL PAID', margin + 6, y + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(pdfMoney(booking.totalAmount), margin + 6, y + 16);
    pdf.setFontSize(9);
    pdf.text(`${booking.numberOfSeats || seatNums.length || 0} seat(s)`, pageWidth - margin - 6, y + 12, {
      align: 'right',
    });
    y += 28;

    // QR section
    let qrImage = qrDataUrl;
    if (!qrImage && scanPayload) {
      qrImage = await QRCode.toDataURL(scanPayload, {
        width: 320,
        margin: 1,
        color: { dark: '#1a1040', light: '#ffffff' },
      });
    }

    if (qrImage) {
      const qrSize = 48;
      y = ensureSpace(pdf, y, qrSize + 28, margin);
      const boxW = Math.min(contentWidth, 70);
      const boxX = (pageWidth - boxW) / 2;
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(254, 215, 170);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(boxX, y, boxW, qrSize + 22, 3, 3, 'FD');
      const qrX = (pageWidth - qrSize) / 2;
      pdf.addImage(qrImage, 'PNG', qrX, y + 4, qrSize, qrSize);
      pdf.setTextColor(26, 16, 64);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Scan at entry gate', pageWidth / 2, y + qrSize + 10, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 113, 108);
      const codeLines = pdf.splitTextToSize(
        pdfSafe(booking.scanToken || booking.bookingNumber || ''),
        boxW - 6
      );
      pdf.text(codeLines, pageWidth / 2, y + qrSize + 15, { align: 'center' });
      y += qrSize + 28;
    }

    y = ensureSpace(pdf, y, 16, margin);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 113, 108);
    pdf.text('Please arrive 15 minutes before show time.', pageWidth / 2, y, {
      align: 'center',
    });
    pdf.text('One scan per ticket  |  Savan Sentosa Cinema', pageWidth / 2, y + 5, {
      align: 'center',
    });

    // Footer page numbers if multi-page
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 160);
      pdf.text(`Page ${i} of ${pages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

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
          text: `${shareText}\n\n(PDF also downloaded - attach it if needed)`,
        });
        return;
      }

      downloadBlob(blob, fileName);
      toast.success('PDF downloaded - share it from your files');
    });
  }

  async function handleWhatsApp() {
    await withBusy('whatsapp', async () => {
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

      downloadBlob(blob, fileName);
      const url = `https://wa.me/?text=${encodeURIComponent(
        `${shareText}\n\nTicket PDF downloaded - attach ${fileName} in WhatsApp.`
      )}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('PDF downloaded - attach it in WhatsApp');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="no-print absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
        <div className="no-print flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-bold text-ink">Ticket ready</p>
            <p className="text-xs text-muted">QR · Download · Share · Print</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto modal-scroll">
          <div className="ticket-print bg-white">
            <div className="bg-gradient-to-br from-ink via-ink-soft to-teal px-6 py-6 text-center text-white">
              <p className="text-2xl font-extrabold tracking-wide">
                Savan <span className="text-gold">Sentosa</span>
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
                Admission Ticket
              </p>
              <p className="mt-3 font-mono text-xs text-white/80">{booking.bookingNumber}</p>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <p className="text-center font-display text-xl font-bold text-ink break-words">
                {movieTitle}
              </p>
              <p className="text-center text-sm text-muted">
                {formatDate(show?.showDate)} · {formatTime(show?.startTime)}
              </p>

              <Row label="Customer" value={booking.customerName} />
              <Row label="Mobile" value={booking.mobileNumber} />
              <Row label="Seats" value={seatsText} />
              <Row
                label="Guest"
                value={`${guestCount} × ${formatCurrency(
                  booking.guestPrice ?? booking.seatPrice ?? 80
                )}`}
              />
              <Row
                label="Owner"
                value={`${ownerCount} × ${formatCurrency(booking.ownerPrice ?? 50)}`}
              />

              <div className="rounded-xl bg-teal px-4 py-3 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Total</p>
                <p className="text-2xl font-extrabold">{formatCurrency(booking.totalAmount)}</p>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-4">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR code"
                    className="h-40 w-40 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-white text-xs text-muted">
                    Preparing QR…
                  </div>
                )}
                <p className="text-xs font-semibold text-ink">Scan at entry gate</p>
                <p className="break-all text-center font-mono text-[10px] text-muted">
                  {booking.scanToken || booking.bookingNumber}
                </p>
                {booking.checkInStatus === 'CHECKED_IN' ? (
                  <Badge tone="CANCELLED">Already allotted</Badge>
                ) : (
                  <Badge tone="CONFIRMED">Ready to scan</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="no-print shrink-0 space-y-2 border-t border-line px-4 py-3 safe-bottom sm:px-5 sm:py-4">
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
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-2">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="break-words text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

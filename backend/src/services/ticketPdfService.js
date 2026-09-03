const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function money(amount) {
  return `Rs. ${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '-';
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  return String(value);
}

function seatLines(booking) {
  return (booking.seats || []).map((s) => {
    const cat = String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'Owner' : 'Guest';
    const price = s.price != null ? money(s.price) : money(cat === 'Owner' ? booking.ownerPrice : booking.guestPrice);
    return `${s.seatNumber} (${cat} ${price})`;
  });
}

/**
 * Build a ticket PDF buffer for email attachment.
 * @param {object} booking populated booking
 * @returns {Promise<Buffer>}
 */
async function buildTicketPdfBuffer(booking) {
  const movie = booking.movieId || {};
  const show = booking.showId || {};
  const movieTitle = typeof movie === 'object' ? movie.title || 'Movie' : 'Movie';
  const seats = seatLines(booking);
  const guestCount = (booking.seats || []).filter(
    (s) => String(s.category || 'GUEST').toUpperCase() !== 'OWNER'
  ).length;
  const ownerCount = (booking.seats || []).filter(
    (s) => String(s.category || '').toUpperCase() === 'OWNER'
  ).length;
  const scanPayload = booking.scanToken
    ? `SS:${booking.scanToken}`
    : booking.bookingNumber || '';

  let qrDataUrl = '';
  if (scanPayload) {
    qrDataUrl = await QRCode.toDataURL(scanPayload, {
      width: 280,
      margin: 1,
      color: { dark: '#1a1040', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const left = 40;
    const contentW = pageW - 80;

    // Header
    doc.roundedRect(left, 40, contentW, 70, 8).fill('#1a1040');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold');
    doc.text('Savan Sentosa', left, 55, { width: contentW, align: 'center' });
    doc.fillColor('#fbbf24').fontSize(10).font('Helvetica');
    doc.text('CINEMA ADMISSION TICKET', left, 82, { width: contentW, align: 'center' });
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text(String(booking.bookingNumber || ''), left, 98, {
      width: contentW,
      align: 'center',
    });

    let y = 130;
    doc.fillColor('#1a1040').fontSize(16).font('Helvetica-Bold');
    doc.text(movieTitle, left, y, { width: contentW, align: 'center' });
    y = doc.y + 8;

    doc.fillColor('#78716c').fontSize(11).font('Helvetica');
    doc.text(
      `${formatDate(show.showDate)}  |  ${formatTime(show.startTime)}${
        show.endTime ? ` - ${formatTime(show.endTime)}` : ''
      }`,
      left,
      y,
      { width: contentW, align: 'center' }
    );
    y = doc.y + 18;

    function field(label, value) {
      doc.fillColor('#78716c').fontSize(9).font('Helvetica-Bold');
      doc.text(String(label).toUpperCase(), left, y);
      doc.fillColor('#1a1040').fontSize(12).font('Helvetica-Bold');
      doc.text(String(value || '-'), left + 110, y, { width: contentW - 110 });
      y = Math.max(doc.y, y + 16) + 6;
      doc
        .strokeColor('#fed7aa')
        .lineWidth(0.5)
        .moveTo(left, y)
        .lineTo(left + contentW, y)
        .stroke();
      y += 10;
    }

    field('Customer', booking.customerName);
    field('Mobile', booking.mobileNumber);
    if (booking.customerEmail) field('Email', booking.customerEmail);
    field('Seats', seats.join(', ') || '-');
    field('Guest', `${guestCount} x ${money(booking.guestPrice ?? booking.seatPrice ?? 80)}`);
    field('Owner', `${ownerCount} x ${money(booking.ownerPrice ?? 50)}`);

    doc.roundedRect(left, y, contentW, 42, 6).fill('#e11d48');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica');
    doc.text('TOTAL PAID', left + 12, y + 10);
    doc.fontSize(18).font('Helvetica-Bold');
    doc.text(money(booking.totalAmount), left + 12, y + 22);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${booking.numberOfSeats || seats.length} seat(s)`, left, y + 18, {
      width: contentW - 12,
      align: 'right',
    });
    y += 58;

    if (qrDataUrl) {
      const qrSize = 120;
      const qrX = (pageW - qrSize) / 2;
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      doc.image(Buffer.from(base64, 'base64'), qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 8;
      doc.fillColor('#1a1040').fontSize(10).font('Helvetica-Bold');
      doc.text('Scan at entry gate', left, y, { width: contentW, align: 'center' });
      y += 14;
      doc.fillColor('#78716c').fontSize(8).font('Helvetica');
      doc.text(String(booking.scanToken || booking.bookingNumber || ''), left, y, {
        width: contentW,
        align: 'center',
      });
      y += 20;
    }

    doc.fillColor('#78716c').fontSize(8).font('Helvetica');
    doc.text('Please arrive 15 minutes before show time.', left, y, {
      width: contentW,
      align: 'center',
    });
    doc.text('One scan per ticket  |  Savan Sentosa Cinema', left, y + 12, {
      width: contentW,
      align: 'center',
    });

    doc.end();
  });
}

module.exports = { buildTicketPdfBuffer, money, formatDate, formatTime, seatLines };

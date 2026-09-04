const nodemailer = require('nodemailer');
const env = require('../config/env');
const { AppError } = require('../middleware/errorMiddleware');
const {
  buildTicketPdfBuffer,
  money,
  formatDate,
  formatTime,
  seatLines,
} = require('./ticketPdfService');
const logger = require('../utils/logger');

let cachedTransport = null;

function assertSmtpConfigured() {
  if (!env.smtp.user || !env.smtp.pass) {
    throw new AppError(
      'Email is not configured. Set SMTP_USER and SMTP_PASS on the server (Render env vars).',
      503,
      'EMAIL_NOT_CONFIGURED'
    );
  }
}

function getTransport() {
  assertSmtpConfigured();
  if (cachedTransport) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  });

  return cachedTransport;
}

function buildEmailBodies(booking) {
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
  const when = `${formatDate(show.showDate)} · ${formatTime(show.startTime)}`;
  const total = money(booking.totalAmount);

  const text = [
    'Savan Sentosa — Admission Ticket',
    '',
    `Booking: ${booking.bookingNumber}`,
    `Movie: ${movieTitle}`,
    `Show: ${when}`,
    `Customer: ${booking.customerName}`,
    `Mobile: ${booking.mobileNumber}`,
    booking.customerEmail ? `Email: ${booking.customerEmail}` : null,
    `Seats: ${seats.join(', ') || '-'}`,
    `Guest seats: ${guestCount}`,
    `Owner seats: ${ownerCount}`,
    `Total paid: ${total}`,
    '',
    'Your ticket PDF is attached. Please arrive 15 minutes early.',
    'Show the QR code at the entry gate.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1040;background:#fff7ed;padding:24px;border-radius:16px;">
    <div style="background:linear-gradient(135deg,#1a1040,#e11d48);color:#fff;padding:20px;border-radius:12px;text-align:center;">
      <div style="font-size:22px;font-weight:800;">Savan <span style="color:#fbbf24;">Sentosa</span></div>
      <div style="font-size:11px;letter-spacing:2px;margin-top:6px;opacity:.85;">ADMISSION TICKET</div>
      <div style="margin-top:10px;font-family:monospace;font-size:13px;">${booking.bookingNumber}</div>
    </div>
    <h2 style="margin:20px 0 6px;font-size:20px;">${movieTitle}</h2>
    <p style="margin:0 0 16px;color:#78716c;">${when}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#78716c;">Customer</td><td style="padding:8px 0;text-align:right;font-weight:700;">${booking.customerName}</td></tr>
      <tr><td style="padding:8px 0;color:#78716c;">Mobile</td><td style="padding:8px 0;text-align:right;font-weight:700;">${booking.mobileNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#78716c;">Seats</td><td style="padding:8px 0;text-align:right;font-weight:700;">${seats.join(', ') || '-'}</td></tr>
      <tr><td style="padding:8px 0;color:#78716c;">Guest / Owner</td><td style="padding:8px 0;text-align:right;font-weight:700;">${guestCount} / ${ownerCount}</td></tr>
    </table>
    <div style="margin-top:16px;background:#e11d48;color:#fff;border-radius:12px;padding:14px 16px;">
      <div style="font-size:11px;opacity:.85;letter-spacing:1px;">TOTAL PAID</div>
      <div style="font-size:26px;font-weight:800;">${total}</div>
    </div>
    <p style="margin:18px 0 0;font-size:13px;color:#78716c;">
      Ticket PDF is attached. Arrive 15 minutes early and show the QR at the gate.
    </p>
  </div>`;

  return {
    subject: `Ticket ${booking.bookingNumber} — ${movieTitle} | Savan Sentosa`,
    text,
    html,
    summary: {
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail || '',
      mobileNumber: booking.mobileNumber,
      movieTitle,
      showDate: formatDate(show.showDate),
      showTime: formatTime(show.startTime),
      seats: seats,
      seatCount: booking.numberOfSeats || seats.length,
      guestCount,
      ownerCount,
      totalAmount: booking.totalAmount,
      totalLabel: total,
    },
  };
}

/**
 * Send ticket email with PDF attachment (may take several seconds on SMTP).
 */
async function sendBookingTicketEmail(booking, toEmail) {
  const to = String(toEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new AppError('Valid email address is required', 400, 'VALIDATION_ERROR');
  }

  const transport = getTransport();
  const pdfBuffer = await buildTicketPdfBuffer(booking);
  const bodies = buildEmailBodies({
    ...booking,
    customerEmail: booking.customerEmail || to,
  });
  const fileName = `Savan-Sentosa-${booking.bookingNumber || 'ticket'}.pdf`;

  try {
    const info = await transport.sendMail({
      from: env.smtp.from || env.smtp.user,
      to,
      subject: bodies.subject,
      text: bodies.text,
      html: bodies.html,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    logger.info('Ticket email sent', {
      bookingNumber: booking.bookingNumber,
      to,
      messageId: info.messageId,
    });

    return {
      to,
      messageId: info.messageId,
      summary: { ...bodies.summary, customerEmail: to },
    };
  } catch (err) {
    logger.error('Ticket email failed', { message: err.message, to });
    throw new AppError(
      err.responseCode === 535 || /Invalid login|Username and Password not accepted/i.test(err.message)
        ? 'Gmail login failed. Check SMTP_USER and App Password in Render env vars'
        : `Could not send email: ${err.message}`,
      502,
      'EMAIL_SEND_FAILED'
    );
  }
}

/**
 * Validate + queue send so HTTP can return quickly (avoids Render/proxy timeouts).
 */
function queueBookingTicketEmail(booking, toEmail) {
  const to = String(toEmail || '').trim().toLowerCase();
  const bodies = buildEmailBodies({
    ...booking,
    customerEmail: booking.customerEmail || to,
  });

  // Fail fast if SMTP env is missing (before responding "queued")
  assertSmtpConfigured();

  setImmediate(() => {
    sendBookingTicketEmail(booking, to).catch((err) => {
      logger.error('Background ticket email failed', {
        bookingNumber: booking.bookingNumber,
        to,
        message: err.message,
        errorCode: err.errorCode,
      });
    });
  });

  return {
    to,
    queued: true,
    summary: { ...bodies.summary, customerEmail: to },
  };
}

module.exports = {
  sendBookingTicketEmail,
  queueBookingTicketEmail,
  buildEmailBodies,
  assertSmtpConfigured,
};

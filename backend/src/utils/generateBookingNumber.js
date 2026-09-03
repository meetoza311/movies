const Booking = require('../models/Booking');

/**
 * Generate a unique human-readable booking number: BK-YYYYMMDD-0001
 */
async function generateBookingNumber(session = null) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;
  const prefix = `BK-${datePart}-`;

  const query = Booking.findOne({ bookingNumber: new RegExp(`^${prefix}`) })
    .sort({ bookingNumber: -1 })
    .select('bookingNumber')
    .lean();

  if (session) {
    query.session(session);
  }

  const last = await query;
  let nextSeq = 1;

  if (last?.bookingNumber) {
    const parts = last.bookingNumber.split('-');
    const seq = parseInt(parts[2], 10);
    if (!Number.isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

module.exports = { generateBookingNumber };

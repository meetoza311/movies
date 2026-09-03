const DEFAULT_SEATS_PER_ROW = 10;
const MAX_ROWS = 20;
const MAX_SEATS_PER_ROW = 20;

/**
 * Build a theater layout. Missing per-row seat counts default to 10.
 * @param {number} rowCount 1–20
 * @param {Array<number|string|undefined>} rowSeats
 */
function buildTheaterLayout(rowCount, rowSeats = []) {
  const count = Number(rowCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_ROWS) {
    throw new Error('Rows must be between 1 and 20');
  }

  const source = Array.isArray(rowSeats) ? rowSeats : [];
  const rows = [];

  for (let i = 0; i < count; i += 1) {
    let seats = source[i];
    if (seats === undefined || seats === null || seats === '') {
      seats = DEFAULT_SEATS_PER_ROW;
    }
    seats = Number(seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS_PER_ROW) {
      throw new Error(`Row ${rowIndexToLabel(i)} seats must be between 1 and 20`);
    }
    rows.push({ row: rowIndexToLabel(i), seats });
  }

  return {
    rowCount: count,
    rows,
    totalSeats: rows.reduce((sum, row) => sum + row.seats, 0),
  };
}

function generateSeatsFromLayout(layoutRows = []) {
  if (!Array.isArray(layoutRows) || layoutRows.length === 0) {
    throw new Error('Seat layout is required');
  }

  const seats = [];
  for (const item of layoutRows) {
    const row = String(item.row || '').toUpperCase().trim();
    const count = Number(item.seats);
    if (!row || !Number.isInteger(count) || count < 1) {
      throw new Error('Invalid seat layout row');
    }
    for (let col = 1; col <= count; col += 1) {
      seats.push({
        seatNumber: `${row}${col}`,
        row,
        column: col,
      });
    }
  }
  return seats;
}

/**
 * Generate cinema seats for a show.
 * Uses a dynamic column count based on total seats for readable layouts.
 * @param {number} totalSeats
 * @returns {{ seatNumber: string, row: string, column: number }[]}
 */
function generateSeats(totalSeats) {
  if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
    throw new Error('totalSeats must be a positive integer');
  }

  const columns = chooseColumns(totalSeats);
  const seats = [];
  let remaining = totalSeats;
  let rowIndex = 0;

  while (remaining > 0) {
    const rowLabel = rowIndexToLabel(rowIndex);
    const seatsInRow = Math.min(columns, remaining);

    for (let col = 1; col <= seatsInRow; col += 1) {
      seats.push({
        seatNumber: `${rowLabel}${col}`,
        row: rowLabel,
        column: col,
      });
    }

    remaining -= seatsInRow;
    rowIndex += 1;
  }

  return seats;
}

function chooseColumns(totalSeats) {
  if (totalSeats <= 20) return Math.min(10, totalSeats);
  if (totalSeats <= 60) return 10;
  if (totalSeats <= 120) return 12;
  if (totalSeats <= 200) return 14;
  return 16;
}

function rowIndexToLabel(index) {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

module.exports = {
  generateSeats,
  generateSeatsFromLayout,
  buildTheaterLayout,
  chooseColumns,
  rowIndexToLabel,
  DEFAULT_SEATS_PER_ROW,
  MAX_ROWS,
  MAX_SEATS_PER_ROW,
};

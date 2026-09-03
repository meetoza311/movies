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

module.exports = { generateSeats, chooseColumns, rowIndexToLabel };

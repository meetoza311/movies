const { generateSeats, chooseColumns } = require('../src/utils/generateSeats');

describe('generateSeats', () => {
  test('creates exact seat count with unique numbers', () => {
    const seats = generateSeats(100);
    expect(seats).toHaveLength(100);
    const numbers = seats.map((s) => s.seatNumber);
    expect(new Set(numbers).size).toBe(100);
    expect(seats[0]).toMatchObject({ seatNumber: 'A1', row: 'A', column: 1 });
  });

  test('rejects invalid totals', () => {
    expect(() => generateSeats(0)).toThrow();
    expect(() => generateSeats(-5)).toThrow();
  });

  test('chooseColumns scales with size', () => {
    expect(chooseColumns(10)).toBeLessThanOrEqual(10);
    expect(chooseColumns(100)).toBe(12);
    expect(chooseColumns(250)).toBe(16);
  });
});

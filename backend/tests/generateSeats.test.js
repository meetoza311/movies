const { generateSeats, generateSeatsFromLayout, buildTheaterLayout, chooseColumns } = require('../src/utils/generateSeats');

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

describe('theater layout', () => {
  test('defaults each row to 10 seats', () => {
    const layout = buildTheaterLayout(3);
    expect(layout.rowCount).toBe(3);
    expect(layout.totalSeats).toBe(30);
    expect(layout.rows).toEqual([
      { row: 'A', seats: 10 },
      { row: 'B', seats: 10 },
      { row: 'C', seats: 10 },
    ]);
  });

  test('uses selected seats per row', () => {
    const layout = buildTheaterLayout(2, [12, 8]);
    const seats = generateSeatsFromLayout(layout.rows);
    expect(layout.totalSeats).toBe(20);
    expect(seats).toHaveLength(20);
    expect(seats[0]).toMatchObject({ seatNumber: 'A1', row: 'A' });
    expect(seats[12]).toMatchObject({ seatNumber: 'B1', row: 'B' });
  });
});

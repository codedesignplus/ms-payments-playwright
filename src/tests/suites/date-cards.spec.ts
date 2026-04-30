import { test, expect } from '../../fixtures';
import { DateCardDto } from '../../types';

test.describe('📅 Date Cards', () => {

  test('GET /api/datecards → 200 y array no vacío @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');

    expect(res.status()).toBe(200);
    const dates: DateCardDto[] = await res.json();
    expect(dates.length).toBeGreaterThan(0);
  });

  test('no hay fechas pasadas', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    const dates: DateCardDto[] = await res.json();

    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;

    const past = dates.filter((d) => {
      const y = parseInt(d.year);
      const m = parseInt(d.month);
      return y < cy || (y === cy && m < cm);
    });

    expect(past, `Fechas pasadas encontradas: ${JSON.stringify(past)}`).toHaveLength(0);
  });

  test('retorna ~10 años de fechas (100–130 items)', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    const dates: DateCardDto[] = await res.json();

    expect(dates.length).toBeGreaterThanOrEqual(100);
    expect(dates.length).toBeLessThanOrEqual(130);
  });

  test('las fechas están en orden cronológico', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    const dates: DateCardDto[] = await res.json();

    for (let i = 1; i < dates.length; i++) {
      const prev = parseInt(dates[i - 1].year) * 12 + parseInt(dates[i - 1].month);
      const curr = parseInt(dates[i].year) * 12 + parseInt(dates[i].month);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  test('month entre 01-12 y year >= año actual', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    const dates: DateCardDto[] = await res.json();

    const currentYear = new Date().getFullYear();

    for (const d of dates) {
      const m = parseInt(d.month);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(12);
      expect(parseInt(d.year)).toBeGreaterThanOrEqual(currentYear);
    }
  });

  test('IDs son únicos', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    const dates: DateCardDto[] = await res.json();

    const ids = dates.map((d) => d.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

import { test, expect } from '../../fixtures';
import { BankDto } from '../../types';

test.describe('🏦 Banks', () => {

  test('GET /api/bank → 200 y lista no vacía @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('api/bank');

    expect(res.status()).toBe(200);

    const banks: BankDto[] = await res.json();
    expect(banks.length).toBeGreaterThan(0);
  });

  test('cada banco tiene id (UUID), name, code, isActive', async ({ anonApi }) => {
    const res = await anonApi.get('api/bank');
    const banks: BankDto[] = await res.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const bank of banks) {
      expect(bank.id, `id de "${bank.code}" debe ser UUID`).toMatch(uuidRegex);
      expect(bank.name, `name de "${bank.code}" requerido`).toBeTruthy();
      expect(bank.code, `code requerido`).toBeTruthy();
      expect(typeof bank.isActive).toBe('boolean');
    }
  });

  test('los códigos de banco son únicos', async ({ anonApi }) => {
    const res = await anonApi.get('api/bank');
    const banks: BankDto[] = await res.json();

    const codes = banks.map((b) => b.code);
    const uniqueCodes = new Set(codes);

    expect(codes.length).toBe(uniqueCodes.size);
  });

  test('banco sandbox PSE (code=1022) existe @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('api/bank');
    const banks: BankDto[] = await res.json();

    const sandbox = banks.find((b) => b.code === '1022');
    expect(sandbox, 'El banco sandbox code=1022 debe existir').toBeDefined();
  });

  test('endpoint es AllowAnonymous — sin token retorna 200 (no 401/403)', async ({ anonApi }) => {
    const res = await anonApi.get('api/bank');

    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
    expect(res.status()).toBe(200);
  });
});

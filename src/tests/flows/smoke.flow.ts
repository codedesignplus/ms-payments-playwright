/**
 * smoke.flow.ts
 * 8 checks críticos en < 15 segundos.
 * Verifica que el microservicio está vivo en el ambiente desplegado.
 *
 * Correr: npx playwright test --grep @smoke
 */

import { test, expect } from '../../fixtures';

test.describe('🚨 Smoke — ms-payments', () => {

  test('banks responde @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/bank');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
  });

  test('datecards responde @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/datecards');
    expect(res.status()).toBe(200);
  });

  test('PSE disponible en métodos de pago @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=BankTransfer');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.find((m: { code: string }) => m.code === 'PSE')).toBeDefined();
  });

  test('tokenize sin token → 401 (auth activa) @smoke', async ({ anonApi }) => {
    const res = await anonApi.post('/api/payment/tokenize', {
      data: { name: 'TEST', identificationNumber: '123', paymentMethod: 'VISA',
              cardNumber: '4097542810000000', expirationDate: '2028/01', paymentProvider: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test('tokenize datos inválidos → 400 (validación activa) @smoke', async ({ api }) => {
    const res = await api.post('/api/payment/tokenize', {
      data: { name: '', identificationNumber: '', paymentMethod: 'VISA',
              cardNumber: '', expirationDate: '', paymentProvider: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test('webhook body vacío → 403 (firma requerida) @smoke', async ({ anonApi }) => {
    const res = await anonApi.post('/api/payment/notify/Payu', {
      data: '',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status()).toBe(403);
  });

  test('webhook proveedor inválido → 400 @smoke', async ({ anonApi }) => {
    const res = await anonApi.post('/api/payment/notify/ProveedorInvalido', {
      data: 'merchant_id=123',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status()).toBe(400);
  });

  test('gRPC responde para PSE @smoke', async ({ grpc }) => {
    const { initiatePayment, psRequest } = await import('../../helpers/grpc-client');
    const res = await initiatePayment(grpc, psRequest());
    expect(res.success).toBe(true);
  });
});

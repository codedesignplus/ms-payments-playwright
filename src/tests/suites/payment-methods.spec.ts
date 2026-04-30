import { test, expect } from '../../fixtures';
import { PaymentMethodDto } from '../../types';

// TypePaymentMethod: 1=CreditCard 2=DebitCard 3=BankReference 4=BankTransfer 5=Mobile 6=Cash
// PaymentProvider:   1=Payu

test.describe('💳 Payment Methods', () => {

  test('BankTransfer → type=4, PSE presente @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=BankTransfer');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    expect(methods.length).toBeGreaterThan(0);
    methods.forEach((m) => expect(m.type).toBe(4));
    expect(methods.find((m) => m.code === 'PSE')).toBeDefined();
  });

  test('CreditCard → type=1, VISA y MASTERCARD presentes @smoke', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=CreditCard');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.type).toBe(1));
    expect(methods.find((m) => m.code === 'VISA')).toBeDefined();
    expect(methods.find((m) => m.code === 'MASTERCARD')).toBeDefined();
  });

  test('DebitCard → type=2', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=DebitCard');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.type).toBe(2));
  });

  test('Cash → type=6, EFECTY presente', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=Cash');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.type).toBe(6));
    expect(methods.find((m) => m.code === 'EFECTY')).toBeDefined();
  });

  test('MobilePaymentService → type=5, NEQUI presente', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=MobilePaymentService');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.type).toBe(5));
    expect(methods.find((m) => m.code === 'NEQUI')).toBeDefined();
  });

  test('BankReference → type=3', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=BankReference');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.type).toBe(3));
  });

  test('múltiples tipos: BankTransfer+CreditCard → solo types 1 y 4', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=BankTransfer&methods=CreditCard');

    expect(res.status()).toBe(200);
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect([1, 4]).toContain(m.type));
    expect(methods.find((m) => m.code === 'PSE')).toBeDefined();
  });

  test('proveedor inválido → 400', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/ProveedorXYZ?methods=CreditCard');
    expect(res.status()).toBe(400);
  });

  test('todos los métodos tienen provider=1 (Payu)', async ({ anonApi }) => {
    const res = await anonApi.get('/api/paymentmethod/Payu?methods=CreditCard');
    const methods: PaymentMethodDto[] = await res.json();

    methods.forEach((m) => expect(m.provider).toBe(1));
  });
});

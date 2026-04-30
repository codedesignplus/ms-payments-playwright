import { test, expect } from '../../fixtures';
import { TokenizeRequest, TokenizeResponse } from '../../types';

const VISA_CARD: TokenizeRequest = {
  name: 'APPROVED',
  identificationNumber: '32144457',
  paymentMethod: 'VISA',
  cardNumber: '4097440000000004',
  expirationDate: `${new Date().getFullYear() + 1}/${(new Date().getMonth() - 1).toString().padStart(2, '0')}`,
  paymentProvider: 1,
};

test.describe('🔑 Tokenize', () => {

  test.describe('Happy paths', () => {

    test('tokeniza VISA → token, número enmascarado, paymentMethod=VISA @smoke', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', { data: VISA_CARD });

      expect(res.status()).toBe(200);

      const body: TokenizeResponse = await res.json();
      expect(body.creditCardTokenId).toBeTruthy();
      expect(body.maskedNumber).toBeTruthy();
      expect(body.maskedNumber).not.toContain('4097440000000004');
      expect(body.paymentMethod).toBe('VISA');

      // Compartir token con el flow de tarjeta
      process.env.VISA_TOKEN_ID = body.creditCardTokenId;
    });

    test('tokeniza MASTERCARD', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: {
          name: 'MARIA GARCIA',
          identificationNumber: '9876543210',
          paymentMethod: 'MASTERCARD',
          cardNumber: '5186059559590568',  // MASTERCARD sandbox PayU
          expirationDate: '2028/01',
          paymentProvider: 1,
        },
      });

      expect(res.status()).toBe(200);
      const body: TokenizeResponse = await res.json();
      expect(body.creditCardTokenId).toBeTruthy();
      expect(body.paymentMethod).toBe('MASTERCARD');
      process.env.MASTERCARD_TOKEN_ID = body.creditCardTokenId;
    });

    test('tokeniza AMEX (15 dígitos)', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: {
          name: 'CARLOS RODRIGUEZ',
          identificationNumber: '1122334455',
          paymentMethod: 'AMEX',
          cardNumber: '377813000000001',   // AMEX sandbox PayU
          expirationDate: '2028/01',
          paymentProvider: 1,
        },
      });

      expect(res.status()).toBe(200);
      const body: TokenizeResponse = await res.json();
      expect(body.creditCardTokenId).toBeTruthy();
    });
  });

  test.describe('Validaciones — Expect 400', () => {

    test('número de tarjeta inválido (falla Luhn) → 400', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: { ...VISA_CARD, cardNumber: '1234567890123456' },
      });
      expect(res.status()).toBe(400);
    });

    test('formato de fecha MM/YYYY en lugar de YYYY/MM → 400', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: { ...VISA_CARD, expirationDate: '01/2028' },
      });
      expect(res.status()).toBe(400);
    });

    test('fecha de expiración mayor a 7 chars → 400', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: { ...VISA_CARD, expirationDate: '2028/012' },
      });
      expect(res.status()).toBe(400);
    });

    test('campos vacíos → 400', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: { ...VISA_CARD, name: '', identificationNumber: '', cardNumber: '', expirationDate: '' },
      });
      expect(res.status()).toBe(400);
    });

    test('paymentProvider=0 (None) → 400', async ({ api }) => {
      const res = await api.post('/api/payment/tokenize', {
        data: { ...VISA_CARD, paymentProvider: 0 },
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('Autenticación', () => {

    test('sin token → 401 @smoke', async ({ anonApi }) => {
      const res = await anonApi.post('/api/payment/tokenize', { data: VISA_CARD });
      expect(res.status()).toBe(401);
    });
  });
});

/**
 * credit-card-e2e.flow.ts
 * Flujo E2E completo: tokenizar → pagar → confirmar con webhook.
 */

import { test, expect } from '../../fixtures';
import { initiatePayment, creditCardRequest } from '../../helpers/grpc-client';
import { buildWebhookBody } from '../../helpers/payu-sign';
import { TokenizeResponse } from '../../types';

const ctx = {
  visaTokenId: '',
  paymentId: '',
};

test.describe('🔄 Flujo E2E — Credit Card Token (VISA)', () => {

  // ─── STEP 1 ──────────────────────────────────────────────────────────────
  test('Step 1 — POST /api/payment/tokenize → tokenizar VISA sandbox', async ({ api }) => {
    await test.step('Enviar tarjeta VISA sandbox a tokenizar', async () => {
      const res = await api.post('/api/payment/tokenize', {
        data: {
          name: 'APPROVED',
          identificationNumber: '1234567890',
          paymentMethod: 'VISA',
          cardNumber: '4097440000000004',
          expirationDate: `${new Date().getFullYear() + 1}/${(new Date().getMonth() - 1).toString().padStart(2, '0')}`,
          paymentProvider: 1,
        },
      });

      expect(res.status()).toBe(200);

      const body: TokenizeResponse = await res.json();
      expect(body.creditCardTokenId).toBeTruthy();
      expect(body.maskedNumber).toBeTruthy();
      expect(body.maskedNumber).not.toContain('4097440000000004');
      expect(body.paymentMethod).toBe('VISA');

      ctx.visaTokenId = body.creditCardTokenId!;
      process.env.VISA_TOKEN_ID = ctx.visaTokenId;
    });

    await test.step('Confirmar token guardado', async () => {
      expect(ctx.visaTokenId).toBeTruthy();
      console.log(`  visaTokenId = ${ctx.visaTokenId}`);
    });
  });

  // ─── STEP 2 ──────────────────────────────────────────────────────────────
  test('Step 2 — gRPC InitiatePayment → iniciar pago con VISA token', async ({ grpc }) => {
    await test.step('Verificar token disponible', async () => {
      expect(ctx.visaTokenId, 'visaTokenId debe existir del step 1').toBeTruthy();
    });

    await test.step('Llamar InitiatePayment con token VISA', async () => {
      const req = creditCardRequest(ctx.visaTokenId);
      const res = await initiatePayment(grpc, req);

      expect(res.success).toBe(true);
      expect(res.payment_id).toBeTruthy();
      // Tarjeta no redirige, espera webhook de confirmación
      expect(res.next_action).toBe('WaitConfirmation');

      ctx.paymentId = res.payment_id as string;
      process.env.ORDER_ID = ctx.paymentId;

      console.log(`  payment_id = ${ctx.paymentId}`);
      console.log(`  nextAction = WaitConfirmation → esperando webhook de PayU`);
    });
  });

  // ─── STEP 3 ──────────────────────────────────────────────────────────────
  test('Step 3 — POST /api/payment/notify → webhook Succeeded', async ({ anonApi }) => {
    await test.step('Verificar paymentId disponible', async () => {
      expect(ctx.paymentId, 'paymentId debe existir del step 2').toBeTruthy();
    });

    await test.step('Enviar webhook Succeeded con firma MD5 correcta', async () => {
      const body = buildWebhookBody(ctx.paymentId, '119000.0', '4');

      const res = await anonApi.post('/api/payment/notify/Payu', {
        data: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(res.status()).toBe(200);
      console.log(`  ✅ Pago ${ctx.paymentId} confirmado como Succeeded`);
    });
  });

  // ─── BONUS: Webhook Failed ────────────────────────────────────────────────
  test('Bonus — webhook Failed con pago nuevo', async ({ grpc, anonApi }) => {
    await test.step('Iniciar segundo pago con mismo token', async () => {
      if (!ctx.visaTokenId) { test.skip(); return; }

      const req = creditCardRequest(ctx.visaTokenId, {
        id: crypto.randomUUID(),
        referenceId: crypto.randomUUID(),
      });

      const res = await initiatePayment(grpc, req);
      expect(res.success).toBe(true);

      const failedPaymentId = res.payment_id as string;

      const webhookBody = buildWebhookBody(failedPaymentId, '119000.0', '6');
      const webhookRes = await anonApi.post('/api/payment/notify/Payu', {
        data: webhookBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(webhookRes.status()).toBe(200);
      console.log(`  ✅ Pago ${failedPaymentId} marcado como Failed`);
    });
  });
});

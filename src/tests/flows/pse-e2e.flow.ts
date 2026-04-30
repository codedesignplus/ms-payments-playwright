/**
 * pse-e2e.flow.ts
 * Flujo E2E completo para pago PSE.
 *
 * En el UI Mode de Playwright cada step aparece expandible con:
 *  - Request enviada (headers, body)
 *  - Response recibida (status, body)
 *  - Tiempo de respuesta
 *  - Assertions que pasaron/fallaron
 */

import { test, expect } from '../../fixtures';
import { initiatePayment, psRequest } from '../../helpers/grpc-client';
import { buildWebhookBody } from '../../helpers/payu-sign';
import { BankDto, DateCardDto, PaymentMethodDto } from '../../types';

// Contexto compartido entre steps del mismo flujo
const ctx = {
  pseCode: '',
  paymentId: '',
};

test.describe('🔄 Flujo E2E — PSE completo', () => {

  // ─── STEP 1 ──────────────────────────────────────────────────────────────
  test('Step 1 — GET /api/bank → obtener banco sandbox PSE', async ({ anonApi }) => {
    await test.step('Llamar endpoint de bancos', async () => {
      const res = await anonApi.get('/api/bank');
      expect(res.status()).toBe(200);

      const banks: BankDto[] = await res.json();
      expect(banks.length, 'Debe haber al menos un banco').toBeGreaterThan(0);

      const sandbox = banks.find((b) => b.code === '1022');
      expect(sandbox, 'Banco sandbox code=1022 debe existir').toBeDefined();

      ctx.pseCode = sandbox!.code;
    });

    await test.step('Guardar pseCode en contexto', async () => {
      expect(ctx.pseCode).toBe('1022');
      console.log(`  pseCode = ${ctx.pseCode}`);
    });
  });

  // ─── STEP 2 ──────────────────────────────────────────────────────────────
  test('Step 2 — GET /api/datecards → verificar fechas futuras', async ({ anonApi }) => {
    await test.step('Llamar endpoint de fechas', async () => {
      const res = await anonApi.get('/api/datecards');
      expect(res.status()).toBe(200);

      const dates: DateCardDto[] = await res.json();
      expect(dates.length).toBeGreaterThan(0);

      const now = new Date();
      const pastDates = dates.filter((d) => {
        const y = parseInt(d.year);
        const m = parseInt(d.month);
        return y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1);
      });

      expect(pastDates, 'No deben haber fechas pasadas').toHaveLength(0);
    });
  });

  // ─── STEP 3 ──────────────────────────────────────────────────────────────
  test('Step 3 — GET /api/paymentmethod → PSE disponible', async ({ anonApi }) => {
    await test.step('Verificar método PSE activo', async () => {
      const res = await anonApi.get('/api/paymentmethod/Payu?methods=BankTransfer');
      expect(res.status()).toBe(200);

      const methods: PaymentMethodDto[] = await res.json();
      const pse = methods.find((m) => m.code === 'PSE');

      expect(pse, 'PSE debe estar disponible como método de pago').toBeDefined();
      expect(pse?.type).toBe(4); // BankTransfer
      console.log(`  PSE disponible: ${pse?.name}`);
    });
  });

  // ─── STEP 4 ──────────────────────────────────────────────────────────────
  test('Step 4 — gRPC InitiatePayment → iniciar pago PSE', async ({ grpc }) => {
    await test.step('Construir request PSE', async () => {
      expect(ctx.pseCode, 'pseCode debe estar definido del step 1').toBeTruthy();
    });

    await test.step('Llamar InitiatePayment vía gRPC', async () => {
      const req = psRequest({
        paymentMethod: {
          type: 'PSE',
          pse: {
            pseCode: ctx.pseCode,
            typePerson: 'N',
            pseResponseUrl: 'https://services.kappali.com/ms-licenses/payment/response',
          },
        },
      });

      const res = await initiatePayment(grpc, req);

      expect(res.success).toBe(true);
      expect(res.payment_id).toBeTruthy();
      expect(res.next_action).toBe('Redirect');

      ctx.paymentId = res.payment_id as string;
      process.env.ORDER_ID = ctx.paymentId;

      console.log(`  payment_id = ${ctx.paymentId}`);
      if (res.redirect_url) {
        console.log(`  redirectUrl = ${res.redirect_url}`);
        console.log(`  ℹ️  Abrir esa URL en browser para completar PSE en sandbox`);
      }
    });
  });

  // ─── STEP 5 ──────────────────────────────────────────────────────────────
  test('Step 5 — POST /api/payment/notify → webhook Succeeded', async ({ anonApi }) => {
    await test.step('Calcular firma MD5 de PayU', async () => {
      expect(ctx.paymentId, 'paymentId debe estar definido del step 4').toBeTruthy();
    });

    await test.step('Enviar webhook simulado', async () => {
      const body = buildWebhookBody(ctx.paymentId, '119000.0', '4');

      const res = await anonApi.post('/api/payment/notify/Payu', {
        data: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(res.status()).toBe(200);
      console.log(`  ✅ Webhook procesado — pago ${ctx.paymentId} = Succeeded`);
    });
  });
});

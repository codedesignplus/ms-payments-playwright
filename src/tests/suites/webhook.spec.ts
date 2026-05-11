import { test, expect } from '../../fixtures';
import { buildWebhookBody } from '../../helpers/payu-sign';

const ORDER_ID = process.env.ORDER_ID ?? crypto.randomUUID();
const AMOUNT = '119000.0';

async function postWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  provider: string,
  body: string,
) {
  return ctx.post(`api/payment/notify/${provider}`, {
    data: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

test.describe('🔔 Webhook', () => {

  test.describe('Firma correcta', () => {

    test('state_pol=4 Succeeded — firma válida no retorna 403 @smoke', async ({ anonApi }) => {
      const body = buildWebhookBody(ORDER_ID, AMOUNT, '4');
      const res = await postWebhook(anonApi, 'Payu', body);

      // 200 si orderId existe, 4xx si no existe
      // Lo importante: no debe ser 403 (firma inválida)
      expect(res.status()).not.toBe(403);
    });

    test('state_pol=6 Failed — firma válida no retorna 403', async ({ anonApi }) => {
      const body = buildWebhookBody(ORDER_ID, AMOUNT, '6');
      const res = await postWebhook(anonApi, 'Payu', body);

      expect(res.status()).not.toBe(403);
    });
  });

  test.describe('Firma inválida — Expect 403', () => {

    test('sign MD5 incorrecto → 403 @smoke', async ({ anonApi }) => {
      const body = buildWebhookBody(ORDER_ID, AMOUNT, '4');
      const corrupted = body.replace(/sign=[^&]+/, 'sign=aaaabbbbcccc0000aaaabbbbcccc0000');

      const res = await postWebhook(anonApi, 'Payu', corrupted);
      expect(res.status()).toBe(403);
    });

    test('monto manipulado — sign con 119000 pero form envía 50000 → 403', async ({ anonApi }) => {
      // El sign se calcula con AMOUNT=119000 pero el form envía 50000
      const body = buildWebhookBody(ORDER_ID, AMOUNT, '4');
      const tampered = body.replace(`value=${AMOUNT}`, 'value=50000.0');

      const res = await postWebhook(anonApi, 'Payu', tampered);
      expect(res.status()).toBe(403);
    });

    test('body vacío — sin merchant_id entra al else del adapter → 403', async ({ anonApi }) => {
      const res = await postWebhook(anonApi, 'Payu', '');
      expect(res.status()).toBe(403);
    });
  });

  test.describe('Errores de ruta', () => {

    test('proveedor desconocido → 400 @smoke', async ({ anonApi }) => {
      const body = buildWebhookBody(ORDER_ID, AMOUNT, '4');
      const res = await postWebhook(anonApi, 'ProveedorXYZ', body);

      expect(res.status()).toBe(400);
    });

    test('reference_sale no es UUID → 4xx', async ({ anonApi }) => {
      const body = buildWebhookBody('NOT-A-GUID', AMOUNT, '4');
      const res = await postWebhook(anonApi, 'Payu', body);

      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  });
});

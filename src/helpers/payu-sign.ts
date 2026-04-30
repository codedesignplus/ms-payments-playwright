import { createHash } from 'crypto';
import { getConfig } from '../config/environments';

export type StatePol = '4' | '6' | '5'; // Succeeded | Failed | Expired

/**
 * Calcula la firma MD5 que PayU usa para validar webhooks.
 * Fórmula: MD5(apiKey~merchantId~referenceSale~value~currency~statePol)
 */
export function buildPayuSign(
  referenceSale: string,
  value: string,
  currency: string,
  statePol: StatePol,
): string {
  const cfg = getConfig();
  const raw = `${cfg.payuApiKey}~${cfg.payuMerchantId}~${referenceSale}~${value}~${currency}~${statePol}`;
  return createHash('md5').update(raw).digest('hex');
}

/**
 * Construye el body en formato application/x-www-form-urlencoded
 * para el webhook de PayU con la firma calculada automáticamente.
 */
export function buildWebhookBody(
  orderId: string,
  value: string,
  statePol: StatePol,
): string {
  const cfg = getConfig();
  const sign = buildPayuSign(orderId, value, 'COP', statePol);

  const params = new URLSearchParams({
    merchant_id: cfg.payuMerchantId,
    reference_sale: orderId,
    value,
    currency: 'COP',
    state_pol: statePol,
    sign,
    response_message_pol: statePol === '4' ? 'APPROVED' : 'DECLINED',
    transaction_id: crypto.randomUUID(),
    payment_method_type: '7',
  });

  return params.toString();
}

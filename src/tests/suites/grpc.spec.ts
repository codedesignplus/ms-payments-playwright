import { test, expect } from '../../fixtures';
import { initiatePayment, psRequest, creditCardRequest } from '../../helpers/grpc-client';
import { readSettingsCache } from './../../helpers/settings-cache';

test.describe('🔗 gRPC — InitiatePayment', () => {

  test('PSE happy path → success=true, nextAction=Redirect @smoke', async ({ grpc }) => {
    const req = psRequest();
    const res = await initiatePayment(grpc, req);

    console.log('Response gRPC InitiatePayment:', res);

    expect(res.success).toBe(true);
    expect(res.payment_id).toBeTruthy();
    expect(res.next_action).toBe('Redirect');
  });

  test('PSE persona jurídica (typePerson=J) → success=true', async ({ grpc }) => {
    const req = psRequest({
      subTotal: { value: '1000000',  currency: { value: 'COP' } },
      tax:      { value: '190000',  currency: { value: 'COP' } },
      total:    { value: '1190000',  currency: { value: 'COP' } },
      payer: {
        fullName: 'Conjunto Los Pinos SAS',
        emailAddress: 'wliscano@codedesignplus.com',
        contactPhone: '+5716543210',
        dniNumber: '900123456',
        dniType: 'NIT',
        billingAddress: {
          street: 'Av El Dorado 69-76',
          country: 'CO',
          state: 'Cundinamarca',
          city: 'Bogota',
          postalCode: '110911',
          phone: '6543210',
        },
      },
      paymentMethod: {
        type: 'PSE',
        pse: {
          pseCode: '1022',
          typePerson: 'J',
          pseResponseUrl: 'https://services.kappali.com/ms-licenses/payment/response',
        },
      },
    });

    const res = await initiatePayment(grpc, req);
    
    console.log('Response gRPC InitiatePayment:', res);

    expect(res.success).toBe(true);
  });

  test('Credit Card Token → success=true, nextAction=WaitConfirmation', async ({ grpc }) => {

    const settings = readSettingsCache();

    if (!settings) {
      console.warn('Not settings cache found, skipping credit card test');
      test.skip();
      return;
    }

    const tokenId = process.env.VISA_TOKEN_ID ?? readSettingsCache()?.visaTokenId;
    if (!tokenId) {
      console.warn('VISA_TOKEN_ID no configurado, se omite test de tarjeta de crédito');
      test.skip();
      return;
    }

    const req = creditCardRequest(tokenId);
    const res = await initiatePayment(grpc, req);

    console.log('Response gRPC InitiatePayment:', res);

    expect(res.success).toBe(true);
    expect(res.next_action).toBe('WaitConfirmation');
  });

  test.describe('Errores de dominio', () => {

    test('total != subTotal+tax → error', async ({ grpc }) => {
      const req = psRequest({
        subTotal: { value: '100000',  currency: { value: 'COP' } },
        tax:      { value: '19000',   currency: { value: 'COP' } },
        total:    { value: '99999',   currency: { value: 'COP' } }, // incorrecto
      });

      await expect(initiatePayment(grpc, req)).rejects.toThrow();
    });

    test('id no es UUID → INVALID_ARGUMENT', async ({ grpc }) => {
      const req = psRequest({ id: 'not-a-valid-guid' });
      await expect(initiatePayment(grpc, req)).rejects.toThrow();
    });

    test('country=COL (3 letras) → error de dominio', async ({ grpc }) => {
      const req = psRequest({
        payer: {
          fullName: 'Test', emailAddress: 'test@test.com',
          contactPhone: '+573001234567', dniNumber: '123', dniType: 'CC',
          billingAddress: {
            street: 'Calle 1', country: 'COL', state: 'Cundinamarca',
            city: 'Bogota', postalCode: '110111', phone: '3001234',
          },
        },
      });

      await expect(initiatePayment(grpc, req)).rejects.toThrow();
    });

    test('pseResponseUrl inválida → error', async ({ grpc }) => {
      const req = psRequest({
        paymentMethod: {
          type: 'PSE',
          pse: { pseCode: '1022', typePerson: 'N', pseResponseUrl: 'not-a-url' },
        },
      });

      await expect(initiatePayment(grpc, req)).rejects.toThrow();
    });

    test('provider=None (0) → validación', async ({ grpc }) => {
      const req = psRequest({ provider: 'None' });
      await expect(initiatePayment(grpc, req)).rejects.toThrow();
    });
  });
});

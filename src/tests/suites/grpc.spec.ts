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
      buyer: {
        buyerId: crypto.randomUUID(),
        name: 'Conjunto Los Pinos SAS',
        phone: '+5716543210',
        email: 'conjunto@lospinos.com',
        typeDocument: { code: 'NIT', name: 'Número de Identificación Tributaria' },
        document: '900123456',
      },
      payer: {
        fullName: 'Conjunto Los Pinos SAS',
        emailAddress: 'wliscano@codedesignplus.com',
        contactPhone: '+5716543210',
        typeDocument: { code: 'NIT', name: 'Número de Identificación Tributaria' },
        documentNumber: '900123456',
        billingAddress: {
          street: 'Av El Dorado 69-76',
          country: 'CO',
          state: 'Cundinamarca',
          city: 'Bogota',
          postalCode: '110911',
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

  test('Buyer y Payer diferentes @smoke', async ({ grpc }) => {
    const req = psRequest({
      buyer: {
        buyerId: crypto.randomUUID(),
        name: 'Company ABC SAS',
        phone: '+573001112222',
        email: 'buyer@companyabc.com',
        typeDocument: { code: 'NIT', name: 'Número de Identificación Tributaria' },
        document: '900987654',
        shippingAddress: {
          street: 'Calle 100 #15-20',
          country: 'CO',
          state: 'Cundinamarca',
          city: 'Bogota',
          postalCode: '110111',
        },
      },
      payer: {
        fullName: 'Juan Carlos Pérez',
        emailAddress: 'juan.perez@example.com',
        contactPhone: '+573009998888',
        typeDocument: { code: 'CC', name: 'Cédula de Ciudadanía' },
        documentNumber: '1098765432',
        billingAddress: {
          street: 'Carrera 7 #80-50',
          country: 'CO',
          state: 'Cundinamarca',
          city: 'Bogota',
          postalCode: '110221',
        },
      },
    });

    const res = await initiatePayment(grpc, req);

    console.log('Response gRPC InitiatePayment (buyer ≠ payer):', res);

    expect(res.success).toBe(true);
    expect(res.payment_id).toBeTruthy();
  });

  test('Solo buyer, sin payer → backend debe inferir payer del buyer', async ({ grpc }) => {
    const buyerData = {
      buyerId: crypto.randomUUID(),
      name: 'Ana María Gómez',
      phone: '+573005554444',
      email: 'ana.gomez@example.com',
      typeDocument: { code: 'CC', name: 'Cédula de Ciudadanía' },
      document: '1122334455',
      shippingAddress: {
        street: 'Avenida 68 #45-30',
        country: 'CO',
        state: 'Cundinamarca',
        city: 'Bogota',
        postalCode: '111321',
      },
    };

    const req = psRequest({
      buyer: buyerData,
      // NO enviamos payer - el backend debe usar la info del buyer
    });

    // Eliminar payer del request para esta prueba
    delete req.payer;

    const res = await initiatePayment(grpc, req);

    console.log('Response gRPC InitiatePayment (solo buyer):', res);

    expect(res.success).toBe(true);
    expect(res.payment_id).toBeTruthy();
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
          fullName: 'Test',
          emailAddress: 'test@test.com',
          contactPhone: '+573001234567',
          typeDocument: { code: 'CC', name: 'Cédula de Ciudadanía' },
          documentNumber: '123',
          billingAddress: {
            street: 'Calle 1',
            country: 'COL',
            state: 'Cundinamarca',
            city: 'Bogota',
            postalCode: '110111',
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

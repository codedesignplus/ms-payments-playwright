import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { getConfig } from '../config/environments';

const PROTO_PATH = join(__dirname, '../proto/payment.proto');

let packageDefinition: protoLoader.PackageDefinition | null = null;

function getProto() {
  if (!packageDefinition) {
    packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return grpc.loadPackageDefinition(packageDefinition) as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GrpcClient = any;

export function createGrpcClient(): GrpcClient {
  const cfg = getConfig();
  const proto = getProto();

  let channelCreds: grpc.ChannelCredentials;

  if (cfg.grpcSecure) {
    // TLS (staging): combina SSL + Bearer token en metadata
    const callCreds = grpc.credentials.createFromMetadataGenerator(
      (_params, callback) => {
        const meta = new grpc.Metadata();
        if (cfg.authToken) meta.add('authorization', `Bearer ${cfg.authToken}`);
        callback(null, meta);
      },
    );
    channelCreds = grpc.credentials.combineChannelCredentials(
      grpc.credentials.createSsl(),
      callCreds,
    );
  } else {
    // Plaintext (local): insecure NO admite combineChannelCredentials.
    // El token se inyecta vía interceptor en cada llamada.
    channelCreds = grpc.credentials.createInsecure();
  }

  const clientOptions: grpc.ClientOptions = {};

  if (!cfg.grpcSecure && cfg.authToken) {
    clientOptions.interceptors = [
      (options: grpc.InterceptorOptions, nextCall: grpc.NextCall) => {
        return new grpc.InterceptingCall(nextCall(options), {
          start(metadata, listener, next) {
            metadata.add('authorization', `Bearer ${cfg.authToken}`);
            next(metadata, listener);
          },
        });
      },
    ];
  }

  return new proto.Payment.Payment(cfg.grpcUrl, channelCreds, clientOptions);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initiatePayment(client: GrpcClient, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    client.InitiatePayment(
      request,
      (err: grpc.ServiceError | null, res: unknown) => {
        if (err) reject(err);
        else resolve(res);
      },
    );
  });
}

/** Request PSE base para tests */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function psRequest(overrides: Record<string, any> = {}) {
  return {
    id: crypto.randomUUID(),
    module: 'Licenses',
    referenceId: crypto.randomUUID(),
    subTotal: { value: '100000',  currency: { value: 'COP' } },
    tax: { value: '19000',  currency: { value: 'COP' } },
    total: { value: '119000',  currency: { value: 'COP' } },
    description: 'Pago licencia Pro Tier - PSE Test',
    payer: {
      fullName: 'Wilzon Camilo Liscano Galindo',
      emailAddress: 'wliscano@codedesignplus.com',
      contactPhone: '+573001234567',
      dniNumber: '1234567890',
      dniType: 'CC',
      billingAddress: {
        street: 'Carrera 7 32-16',
        country: 'CO',
        state: 'Cundinamarca',
        city: 'Bogota',
        postalCode: '110311',
        phone: '3001234567',
      },
    },
    paymentMethod: {
      type: 'PSE',
      pse: {
        pseCode: process.env.PSE_CODE ?? '1022',
        typePerson: 'N',
        pseResponseUrl: 'https://services.kappali.com/ms-licenses/payment/response',
      },
    },
    provider: 'Payu',
    ...overrides,
  };
}

/** Request tarjeta de crédito tokenizada */
export function creditCardRequest(tokenId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    module: 'Licenses',
    referenceId: crypto.randomUUID(),
    subTotal: { value: '100000',  currency: { value: 'COP' } },
    tax: { value: '19000',  currency: { value: 'COP' } },
    total: { value: '119000',  currency: { value: 'COP' } },
    description: 'Pago licencia Pro Tier - VISA Token Test',
    payer: {
      fullName: 'Maria Garcia Lopez',
      emailAddress: 'wliscano@codedesignplus.com',
      contactPhone: '+573109876543',
      dniNumber: '9876543210',
      dniType: 'CC',
      billingAddress: {
        street: 'Calle 100 15-30',
        country: 'CO',
        state: 'Cundinamarca',
        city: 'Bogota',
        postalCode: '110221',
        phone: '3109876543',
      },
    },
    paymentMethod: {
      type: 'VISA',
      creditCard: {
        last4Digits: '0000',
        cardHolderName: 'APPROVED',
        creditCardTokenId: tokenId,
        expirationDate: '2028/01',
        securityCode: '777',
        installmentsNumber: 1,
      },
    },
    provider: 'Payu',
    ...overrides,
  };
}

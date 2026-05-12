# Sistema de Limpieza de Datos de Prueba - MS-Payments

## Descripción

Sistema automático de limpieza que rastrea los pagos y tokens creados durante las pruebas para limpiarlos inmediatamente después de cada test.

## ¿Cómo funciona?

### 1. Rastreo de registros creados

Cuando un test crea un payment o token, registra su ID en el `cleanupTracker`:

```typescript
import { cleanupTracker } from '../../helpers/cleanup-tracker';

// En un test que crea un payment
const paymentId = res.payment_id;
cleanupTracker.trackPayment(paymentId);

// En un test que crea un token
const tokenId = res.creditCardTokenId;
cleanupTracker.trackToken(tokenId);
```

### 2. Limpieza automática (afterEach en fixtures)

El fixture `api` limpia automáticamente después de cada test:

```typescript
// En src/fixtures/index.ts
await use(ctx);

// CLEANUP: Limpiar registros rastreados
const trackedPayments = cleanupTracker.getTrackedPayments();
const trackedTokens = cleanupTracker.getTrackedTokens();

for (const paymentId of trackedPayments) {
  cleanupTracker.removePayment(paymentId);
}
for (const tokenId of trackedTokens) {
  cleanupTracker.removeToken(tokenId);
}
```

## Estructura de archivos

```
ms-payments-playwright/
├── src/
│   ├── fixtures/
│   │   └── index.ts                  # Hooks afterEach de limpieza ⭐
│   └── helpers/
│       └── cleanup-tracker.ts        # Rastreo de IDs creados ⭐
└── playwright.config.ts
```

## Uso en tests

### Tests que crean payments

```typescript
import { cleanupTracker } from '../../helpers/cleanup-tracker';

test('iniciar pago', async ({ grpc }) => {
  const req = creditCardRequest(tokenId);
  const res = await initiatePayment(grpc, req);
  
  cleanupTracker.trackPayment(res.payment_id); // ⭐ Registrar
});
```

### Tests que crean tokens

```typescript
test('tokenizar tarjeta', async ({ api }) => {
  const res = await api.post('api/payment/tokenize', { data: cardData });
  const body = await res.json();
  
  cleanupTracker.trackToken(body.creditCardTokenId); // ⭐ Registrar
});
```

## Nota importante sobre Payments

⚠️ **Los pagos y tokens generalmente NO se eliminan físicamente** por razones de auditoría y cumplimiento. Este sistema de cleanup:

1. **Rastrea** los IDs creados durante los tests
2. **Limpia el tracker** después de cada test (no los datos)
3. Permite que **global-teardown** identifique datos de prueba si se implementa limpieza física en el futuro

Para limpiezas físicas, se recomienda usar:
- Soft delete (marcar como cancelado/expirado)
- Limpieza programada por antigüedad
- Entorno de pruebas aislado

# ms-payments — Playwright Tests

Tests E2E, smoke y regression para el microservicio `ms-payments`.

---

## Instalación

```bash
cd ms-payments-playwright
npm install
npx playwright install   # instala los browsers
```

---

## Comandos principales

### 🖥️ Modo UI (recomendado para desarrollo y debugging)

```bash
npm run test:ui
```

Abre el Playwright UI Mode en el browser. Desde ahí puedes:
- Ver todos los tests en el panel izquierdo
- Ejecutar tests individualmente con click
- Ver cada step expandible con request/response completa
- Ver el tiempo de cada llamada HTTP
- Filtrar por nombre, archivo o tag (@smoke)
- Ver el trace de cualquier test fallido
- Re-ejecutar sin cerrar la ventana

### 🐛 Debug paso a paso

```bash
npm run test:debug
```

Abre un browser con el Playwright Inspector. Puedes:
- Poner breakpoints en el código
- Avanzar step a step
- Ver variables en tiempo real

### Por ambiente

```bash
# Staging (default)
AUTH_TOKEN="eyJ..." npm test

# Local (localhost:5000)
ENV=local npm test
```

### Por categoría

```bash
npm run test:smoke    # 8 checks críticos en <15s
npm run test:suites   # todos los tests por endpoint
npm run test:flows    # flujos E2E completos
```

### Reporte HTML

```bash
npm test              # corre los tests
npm run report        # abre el reporte en el browser
```

---

## Estructura

```
src/
├── config/
│   └── environments.ts         # staging (services.kappali.com) / local (localhost)
├── fixtures/
│   └── index.ts                # api, anonApi, grpc, env — disponibles en todos los tests
├── helpers/
│   ├── payu-sign.ts            # cálculo MD5 firma PayU (automático)
│   └── grpc-client.ts          # cliente gRPC con auth y builders de requests
├── proto/
│   └── payment.proto           # contrato gRPC del microservicio
├── types/
│   └── index.ts                # DTOs: BankDto, PaymentMethodDto, etc.
└── tests/
    ├── suites/                 # tests por endpoint (corren independientes)
    │   ├── banks.spec.ts
    │   ├── date-cards.spec.ts
    │   ├── payment-methods.spec.ts
    │   ├── tokenize.spec.ts
    │   ├── webhook.spec.ts
    │   └── grpc.spec.ts
    └── flows/                  # flujos E2E completos (pasos encadenados)
        ├── smoke.flow.ts       ← rápido, para CI/CD post-deploy
        ├── pse-e2e.flow.ts     ← PSE de inicio a fin
        └── credit-card-e2e.flow.ts ← tokenizar → pagar → confirmar
```

---

## Ambientes

| Variable | staging | local |
|---|---|---|
| `baseUrl` | https://services.kappali.com | http://localhost:5000 |
| `apiPath` | /ms-payments | *(vacío)* |
| `grpcUrl` | services.kappali.com:5001 | localhost:5001 |
| `grpcSecure` | true (TLS) | false (plaintext) |

### Variables de entorno

```bash
# .env, .env.local or .env.staging (override default) with:
ENV=staging                                                                     # o local (default: staging)
VISA_TOKEN_ID=uuid                                                              # Token VISA (se genera automáticamente en el flow)
PSE_CODE=1022                                                                   # Código banco PSE sandbox
ORDER_ID=uuid                                                                   # ID de orden para tests de webhook
CLIENT_SECRET=LtY8Q~qJ7********cTPjNSIV19cCt                                    # Client secret para Auth (sólo staging o local)
TEST_USER=fake@email.com                                                        # Usuario de prueba para Auth (sólo staging o local)
TEST_PASSWORD=********                                                          # Contraseña del usuario de prueba (sólo staging o local)
BASE_URL=http://localhost:5000                                                  # URL base para obtener el token de la tarjeta al momnento de iniciar los tests
TOKEN_URL=https://mydomain.ciamlogin.com/11111111-1111-1111-1111-111111111111   # URL del endpoint de Azure AD para obtener el token de autenticación (sólo staging o local)
```

---

## Fixtures disponibles en todos los tests

```typescript
import { test, expect } from '../../fixtures';

test('mi test', async ({ api, anonApi, grpc, env }) => {
  // api     → APIRequestContext con Bearer token
  // anonApi → APIRequestContext sin token (AllowAnonymous)
  // grpc    → cliente gRPC autenticado
  // env     → config del ambiente (baseUrl, grpcUrl, etc.)
});
```

---

## Proyectos de Playwright

| Proyecto | Qué corre | Cuándo |
|---|---|---|
| `smoke` | Tests con tag `@smoke` | Siempre (CI/CD post-deploy) |
| `suites` | `tests/suites/**/*.spec.ts` | En PR y push a main |
| `flows` | `tests/flows/**/*.flow.ts` | Solo en main/staging |

```bash
npx playwright test --project smoke
npx playwright test --project suites
npx playwright test --project flows
```

---

## CI/CD — GitHub Actions

**Secret requerido:** `MS_PAYMENTS_AUTH_TOKEN`

El workflow corre 3 jobs en secuencia:
1. **Smoke** → siempre, en <5 min
2. **Regression** → en PR y push, genera reporte JUnit
3. **E2E Flows** → solo en main/staging

---

## Tarjetas sandbox PayU

| Franquicia | Número | Vencimiento |
|---|---|---|
| VISA | 4097542810000000 | 2028/01 |
| MASTERCARD | 5186059559590568 | 2028/01 |
| AMEX | 377813000000001 | 2028/01 |

---

## Actualizar el proto

Si el contrato gRPC cambia, copia el archivo del proyecto .NET:

```bash
cp ../../src/entrypoints/.../Protos/payment.proto src/proto/payment.proto
```

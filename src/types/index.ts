// ─── Banks ───────────────────────────────────────────────────────────────────
export interface BankDto {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

// ─── Date Cards ──────────────────────────────────────────────────────────────
export interface DateCardDto {
  id: string;
  month: string;
  year: string;
}

// ─── Payment Methods ─────────────────────────────────────────────────────────
export interface PaymentMethodDto {
  id: string;
  name: string;
  code: string;
  /** 1=CreditCard 2=DebitCard 3=BankReference 4=BankTransfer 5=Mobile 6=Cash */
  type: number;
  /** 1=Payu 2=MercadoPago */
  provider: number;
  comments?: string;
}

// ─── Tokenize ────────────────────────────────────────────────────────────────
export interface TokenizeRequest {
  name: string;
  identificationNumber: string;
  paymentMethod: string;
  cardNumber: string;
  expirationDate: string;
  paymentProvider: number;
}

export interface TokenizeResponse {
  creditCardTokenId?: string;
  name?: string;
  payerId?: string;
  identificationNumber?: string;
  paymentMethod?: string;
  maskedNumber?: string;
  errorDescription?: string;
}

// ─── gRPC ────────────────────────────────────────────────────────────────────
export interface GrpcInitiateResponse {
  success: boolean;
  payment_id: string;
  /** 'Redirect' | 'DisplayWidget' | 'WaitConfirmation' */
  next_action: string;
  redirect_url?: string;
  metadata?: Record<string, string>;
}

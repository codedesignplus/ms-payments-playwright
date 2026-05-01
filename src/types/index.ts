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

// ─── Common ValueObjects ─────────────────────────────────────────────────────
export interface TypeDocumentVO {
  code: string;
  name: string;
}

export interface AddressVO {
  street: string;
  country: string;
  state?: string;
  city: string;
  postalCode?: string;
}

// ─── Buyer & Payer ───────────────────────────────────────────────────────────
export interface BuyerDto {
  buyerId: string;
  name: string;
  phone: string;
  email: string;
  typeDocument?: TypeDocumentVO;
  document?: string;
  shippingAddress?: AddressVO;
}

export interface PayerDto {
  fullName: string;
  emailAddress?: string;
  contactPhone?: string;
  typeDocument: TypeDocumentVO;
  documentNumber: string;
  billingAddress: AddressVO;
}

// ─── Payment Method (gRPC structures) ────────────────────────────────────────
export interface CreditCardVO {
  last4Digits: string;
  cardHolderName: string;
  creditCardTokenId: string;
  expirationDate: string;
  securityCode: string;
  installmentsNumber: number;
}

export interface PseVO {
  pseCode: string;
  typePerson: string;
  pseResponseUrl: string;
}

export interface PaymentMethodVO {
  type: string;
  creditCard?: CreditCardVO;
  pse?: PseVO;
}

export interface AmountVO {
  value: number;
  currency: string;
}

// ─── gRPC Request/Response ───────────────────────────────────────────────────
export interface InitiatePaymentRequest {
  id: string;
  module: string;
  referenceId: string;
  subTotal: AmountVO;
  tax: AmountVO;
  total: AmountVO;
  description: string;
  buyer: BuyerDto;
  payer?: PayerDto;
  paymentMethod: PaymentMethodVO;
  provider: PaymentProvider;
}

export enum PaymentProvider {
  None = 0,
  Payu = 1,
  MercadoPago = 2,
}

export enum NextActionType {
  Undefined = 0,
  Redirect = 1,
  DisplayWidget = 2,
  WaitConfirmation = 3,
}

export interface GrpcInitiateResponse {
  success: boolean;
  payment_id: string;
  next_action: NextActionType;
  redirect_url?: string;
  metadata?: Record<string, string>;
}

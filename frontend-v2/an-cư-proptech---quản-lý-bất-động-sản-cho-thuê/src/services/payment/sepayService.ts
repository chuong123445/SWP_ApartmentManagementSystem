import {apiFetch,readApiError} from '@/services/http/client';
export interface SepayConfig {configured:boolean;bank:string|null;accountNumber:string|null;accountHolderName:string|null;virtualAccount:string|null;enabled:boolean;version:number;webhookUrl:string|null;lastWebhookAt:string|null;webhookSecret:string|null}
export interface SepayEvent {transactionId:string;invoiceId:string|null;testPaymentId?:string|null;result:string;amount:string;receivedAt:string}
export interface InvoicePayment {status:'UNPAID'|'PAID'|'NOT_CONFIGURED';paymentCode:string|null;amount:string|null;bank:string|null;accountNumber:string|null;accountHolderName:string|null;qrUrl:string|null;paidAt:string|null}
export async function paymentApi<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await apiFetch(`/api/v1${path}`,{method,signal,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 if(!response.ok)throw await readApiError(response);return response.json();
}

export interface TestReceipt {id:string;createdAt:string;payment:InvoicePayment;contractId:string|null;tenantName:string|null;roomNumber:string|null;ownerName:string|null}

export interface TestRecipient {contractId:string;tenantName:string;roomNumber:string}

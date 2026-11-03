import { paymentApi, type SepayConfig } from './sepayService';

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type WithdrawalAction = 'START' | 'PAID' | 'REJECT' | 'CANCEL';

export interface Withdrawal {
  id: string;
  ownerId: string;
  amount: string;
  bank: string;
  accountNumber: string;
  accountHolder: string;
  status: WithdrawalStatus;
  transferReference: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  canComplete: boolean;
}

export interface SettlementWallet {
  received: string;
  available: string;
  reserved: string;
  paid: string;
  entries: {
    id: string;
    kind: 'INVOICE' | 'ADDITIONAL_RECEIPT' | 'RESERVE' | 'RELEASE' | 'PAYOUT';
    sourceId: string;
    amount: string;
    createdAt: string;
  }[];
}

interface WithdrawalPage {
  items: Withdrawal[];
  page: number;
  totalPages: number;
}

export interface WithdrawalInput {
  requestKey: string;
  amount: string;
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

const ownerPath = '/owner/settlements';
const adminPath = '/admin/settlements';

export const getWallet = (signal: AbortSignal) => paymentApi<SettlementWallet>(ownerPath, 'GET', undefined, signal);
export const getSettlementConnection = (signal: AbortSignal) => paymentApi<SepayConfig>(adminPath + '/connection', 'GET', undefined, signal);
export const getWithdrawals = (admin: boolean, page: number, status: WithdrawalStatus | '', signal: AbortSignal) =>
  paymentApi<WithdrawalPage>(`${admin ? adminPath : ownerPath}/withdrawals?page=${page}${status ? `&status=${status}` : ''}`, 'GET', undefined, signal);
export const requestWithdrawal = (body: WithdrawalInput) => paymentApi<Withdrawal>(ownerPath + '/withdrawals', 'POST', body);
export const decideWithdrawal = (admin: boolean, withdrawal: Withdrawal, action: WithdrawalAction, transferReference = '', note = '') =>
  paymentApi<Withdrawal>(`${admin ? adminPath : ownerPath}/withdrawals/${withdrawal.id}/actions`, 'POST', {
    action, version: withdrawal.version, transferReference, note,
  });

import type { SystemConfig } from '@/types';

export function buildVietQrUrl(
  config: Pick<SystemConfig, 'bankName' | 'bankAccount' | 'accountHolder'>,
  amount: number,
  transferContent: string,
) {
  return `https://img.vietqr.io/image/${config.bankName}-${config.bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(config.accountHolder)}`;
}

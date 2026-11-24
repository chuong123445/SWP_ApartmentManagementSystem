import type { BillingContext } from '@/types/billing';

// Four decimal places preserve the products of two-decimal meter readings and rates.
function amount(value: string) {
  const [integer, fraction = ''] = value.split('.');
  return BigInt(integer) * 10000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
}
export function utilityInvoiceTotal(context: BillingContext, electricity: string, water: string): string | null {
  const perPerson = context.waterBillingMode === 'PER_PERSON';
  const waterEnd = perPerson ? context.waterStartReading : water;
  const values = [electricity, waterEnd, context.electricityStartReading, context.waterStartReading,
    context.electricityUnitPrice, context.waterUnitPrice, context.internetFee ?? '0',
    context.garbageFee ?? '0', context.maintenanceAmount ?? '0'];
  if (!values.every(value => /^\d+(?:[.]\d{1,4})?$/.test(value))) return null;
  const [electricEnd, endWater, electricStart, startWater, electricRate, waterRate, internet, garbage, repairs] = values.map(amount);
  if (electricEnd < electricStart || endWater < startWater) return null;
  const waterQuantity = perPerson ? BigInt(context.occupantCount ?? 1) * 10000n : endWater - startWater;
  const total = (electricEnd - electricStart) * electricRate / 10000n
    + waterQuantity * waterRate / 10000n + internet + garbage + repairs;
  return (total / 10000n).toString() + '.' + (total % 10000n).toString().padStart(4, '0');
}

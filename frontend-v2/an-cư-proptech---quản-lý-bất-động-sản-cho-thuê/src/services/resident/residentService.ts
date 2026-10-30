import { myInvoices } from '@/services/billing/billingService';
import { ownerMaintenance } from '@/services/maintenance/maintenanceService';
import type { BillingInvoice } from '@/types/billing';

// Dùng API của tài khoản đăng nhập; không gửi customerId từ trình duyệt.
export async function roomInvoices(apartmentId:string) {
  const result:BillingInvoice[]=[];
  for(let page=0;;page++){
    const data=await myInvoices(page,100);
    result.push(...data.items.filter(i=>i.apartmentId===apartmentId && i.status==='SENT'));
    if(page+1>=data.totalPages || !data.items.length)return result;
  }
}
export async function roomMaintenance(apartmentId:string){
  return (await ownerMaintenance('all',false)).filter(t=>t.apartmentId===apartmentId);
}

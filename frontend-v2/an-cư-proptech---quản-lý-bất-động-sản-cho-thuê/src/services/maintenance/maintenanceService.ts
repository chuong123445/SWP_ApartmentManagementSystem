import { apiFetch, readApiError } from '@/services/http/client';
import type { PageResult } from '@/types/apartment';
import type { MaintenanceTicket } from '@/types';
interface RecordView {
 id: string; propertyId: string; apartmentId:string|null; roomNumber: string; reporterName: string; title: string; description: string;
 category: string; priority: string; status: string; createdAt: string;
 version:number;technicianName:string|null;technicianPhone:string|null;scheduledAt:string|null;canConfirm:boolean;repairResult:string|null;history:{action:string;note:string;createdAt:string}[];
 actualCost:string|null;customerCost:string|null;costResponsibility:string|null;
 images:{id:string;kind:string}[];
}
export async function ownerMaintenance(propertyId: string, owner = true): Promise<MaintenanceTicket[]> {
 const result: MaintenanceTicket[] = [];
 for (let page = 0; ; page++) {
  const query = new URLSearchParams({ page: String(page), size: '100' });
  if (propertyId !== 'all') query.set('propertyId', propertyId);
  const response = await apiFetch(`/api/v1/${owner?'owner':'me'}/maintenance-tickets?${query}`);
  if (!response.ok) throw await readApiError(response);
  const data: PageResult<RecordView> = await response.json();
  result.push(...data.items.map(t => ({ id: t.id, propertyId: t.propertyId, apartmentId:t.apartmentId, roomNumber: t.roomNumber, tenantName: t.reporterName,
   apiVersion:t.version,technicianName:t.technicianName,technicianPhone:t.technicianPhone,scheduledAt:t.scheduledAt,canConfirm:t.canConfirm,repairResult:t.repairResult,history:t.history,
   actualCost:t.actualCost,customerCost:t.customerCost,costResponsibility:t.costResponsibility,
   images:t.images,
   title: t.title, description: t.description, category: t.category.toLowerCase() as MaintenanceTicket['category'], priority: t.priority.toLowerCase() as MaintenanceTicket['priority'],
   status: (t.status === 'PENDING' ? 'pending' : ['RESOLVED','CANCELLED','REJECTED'].includes(t.status) ? 'resolved' : 'in_progress') as MaintenanceTicket['status'], createdAt: t.createdAt, apiStatus: t.status })));
  if (page + 1 >= data.totalPages) return result;
 }
}
export async function createMaintenance(owner: boolean, input: {propertyId?:string; apartmentId?:string; title:string; description:string; category:string; priority:string}) {
 const response=await apiFetch(`/api/v1/${owner?'owner':'me'}/maintenance-tickets`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 if(!response.ok)throw await readApiError(response);
 return response.json();
}
export async function maintenanceAction(id:string,input:{version:number;action:string;note?:string;technicianName?:string;technicianPhone?:string;scheduledAt?:string;actualCost?:string;costResponsibility?:string;customerCost?:string},owner=true){
 const response=await apiFetch(`/api/v1/${owner?'owner':'me'}/maintenance-tickets/${encodeURIComponent(id)}/actions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 if(!response.ok)throw await readApiError(response);return response.json();
}
export async function uploadMaintenanceImage(id:string,kind:string,file:File){
 const data=new FormData();data.append('file',file);
 const response=await apiFetch(`/api/v1/maintenance-tickets/${encodeURIComponent(id)}/images?kind=${encodeURIComponent(kind)}`,{method:'POST',body:data});
 if(!response.ok)throw await readApiError(response);return response.json();
}

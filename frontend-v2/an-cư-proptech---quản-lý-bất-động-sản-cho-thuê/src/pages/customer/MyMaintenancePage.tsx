import { useEffect,useState } from 'react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { MaintenancePage } from '@/pages/owner/MaintenancePage';
import { ownerMaintenance } from '@/services/maintenance/maintenanceService';
import { myTenancies } from '@/services/billing/billingService';
import type { MaintenanceTicket } from '@/types';
import type { MaintenancePlace } from '@/components/maintenance/MaintenanceForm';
export function MyMaintenancePage(){
 const [tickets,setTickets]=useState<MaintenanceTicket[]>([]);const [places,setPlaces]=useState<MaintenancePlace[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');Promise.all([ownerMaintenance('all',false),myTenancies()]).then(([items,leases])=>{if(active){setTickets(items);setPlaces(leases.filter(c=>c.status==='ACTIVE').map(c=>({value:c.apartmentId,label:`${c.propertyName} — ${c.roomNumber}`,apartmentId:c.apartmentId})));}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không thể tải sự cố.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
 useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 return <CustomerLayout><main className="max-w-7xl mx-auto p-5 py-8"><MaintenancePage owner={false} places={places} tickets={tickets} loading={loading} error={error} onReload={()=>setRevision(v=>v+1)}/></main></CustomerLayout>;
}

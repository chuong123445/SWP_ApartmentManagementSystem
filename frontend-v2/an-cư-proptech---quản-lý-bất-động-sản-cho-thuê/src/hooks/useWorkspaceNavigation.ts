import {useLocation,useSearchParams} from 'react-router';
import { useEffect,useState } from 'react';
import type { ActiveTab, UserRole } from '@/types';

export function useWorkspaceNavigation(canManage: boolean) {
  const [params]=useSearchParams();
  const location=useLocation();
  // User & RBAC State
  const userRole: UserRole = canManage ? 'admin' : 'seeker';

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>(canManage ? 'dashboard' : 'market');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(()=>{if(!canManage)return;const tab=params.get('tab');if(tab&&['home','dashboard','rental_requests','maintenance','contracts','properties','invoices','settings'].includes(tab)){setActiveTab(tab as ActiveTab);const property=params.get('propertyId');setSelectedBuildingId(property&&/^[0-9]+$/.test(property)?property:'all');}},[params,canManage,location.key]);
  // Modals
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [propertyForDossierId, setPropertyForDossierId] = useState<string | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invoiceContractId,setInvoiceContractId]=useState('');


  // Quick Action Handler from Header
  const handleQuickAction = (
    action: 'add-room' | 'add-tenant' | 'add-invoice' | 'record-meter' | 'collect-rent'
  ) => {
    switch (action) {
      case 'add-room':
        setIsAddRoomOpen(true);
        break;
      case 'add-tenant':
        setActiveTab('tenants');
        break;
      case 'add-invoice':
        setIsCreateInvoiceOpen(true);
        break;
      case 'record-meter':
        setActiveTab('utilities');
        break;
      case 'collect-rent':
        setActiveTab('invoices');
        break;
    }
  };


  const selectTab = (tab: ActiveTab) => { if (canManage || tab === 'market') setActiveTab(tab); };
  const resetToDashboard = () => setActiveTab('dashboard');
  return { userRole, activeTab, selectedBuildingId, setSelectedBuildingId, searchQuery, setSearchQuery,
    isAddRoomOpen, setIsAddRoomOpen, isAddPropertyOpen, setIsAddPropertyOpen, propertyForDossierId, setPropertyForDossierId, isCreateInvoiceOpen, setIsCreateInvoiceOpen,
    invoiceContractId,setInvoiceContractId,handleQuickAction, selectTab, resetToDashboard };
}
export type WorkspaceNavigation = ReturnType<typeof useWorkspaceNavigation>;

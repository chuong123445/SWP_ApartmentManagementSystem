import { useState } from 'react';
import type { ActiveTab, UserRole } from '@/types';

export function useWorkspaceNavigation(canManage: boolean) {
  // User & RBAC State
  const userRole: UserRole = canManage ? 'admin' : 'seeker';

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>(canManage ? 'dashboard' : 'market');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);


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
    isAddRoomOpen, setIsAddRoomOpen, isCreateInvoiceOpen, setIsCreateInvoiceOpen,
    handleQuickAction, selectTab, resetToDashboard };
}
export type WorkspaceNavigation = ReturnType<typeof useWorkspaceNavigation>;

import {Navigate} from 'react-router';
import type {RentalWorkspace} from '@/hooks/useRentalWorkspace';
import type {WorkspaceNavigation} from '@/hooks/useWorkspaceNavigation';
import {InvoiceDetailModal} from '@/components/billing/InvoiceDetailModal';
import {CreateInvoiceModal} from '@/components/billing/CreateInvoiceModal';

// Khu vận hành chỉ giữ modal nghiệp vụ; mọi thao tác tài sản đi sang trang riêng.
export function WorkspaceModals({workspace,navigation}:{workspace:RentalWorkspace;navigation:WorkspaceNavigation}){
  return <>
    {workspace.selectedRoom&&<Navigate to={`/apartments/${workspace.selectedRoom.id}`}/>}
    {(navigation.isAddPropertyOpen||navigation.isAddRoomOpen)&&<Navigate to="/account/properties/new"/>}
    {navigation.propertyForDossierId&&<Navigate to="/account/rental-properties" state={{openPropertyId:navigation.propertyForDossierId}}/>}
    {workspace.selectedInvoice&&<InvoiceDetailModal invoice={workspace.selectedInvoice} onClose={()=>workspace.setSelectedInvoice(null)}/>}
    {navigation.isCreateInvoiceOpen&&<CreateInvoiceModal tenancies={workspace.tenancies} initialContractId={navigation.invoiceContractId} onOpenUtilities={()=>{navigation.setIsCreateInvoiceOpen(false);navigation.selectTab('utilities');}} onClose={()=>{navigation.setIsCreateInvoiceOpen(false);navigation.setInvoiceContractId('');}} onCreateInvoice={workspace.handleCreateInvoice}/>}
  </>;
}

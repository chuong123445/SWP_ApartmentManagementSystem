import { useState } from 'react';
import type { RentalWorkspace } from '@/hooks/useRentalWorkspace';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import type { Room } from '@/types';
import { RoomDetailModal } from '@/components/rooms/RoomDetailModal';
import { EditRoomModal } from '@/components/rooms/EditRoomModal';
import { AddRoomModal } from '@/components/rooms/AddRoomModal';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';
import { PropertyDossierModal } from '@/components/property/PropertyDossierModal';

export function WorkspaceModals({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const { selectedRoom, selectedInvoice, setSelectedRoom, setSelectedInvoice, rooms, tenants, contracts, invoices,
    config, handleCheckOut, handleReserveEscrow, handleMarkPaid, handleCreateInvoice, handleAddRoom } = workspace;
  const { isAddRoomOpen, setIsAddRoomOpen, isCreateInvoiceOpen, setIsCreateInvoiceOpen } = navigation;
  const availableProperties = workspace.buildings.filter(p => (navigation.selectedBuildingId === 'all' || p.id === navigation.selectedBuildingId) && (p.rentalMode !== 'SINGLE_UNIT' || p.totalRooms === 0));
  return <>
      {navigation.propertyForDossierId && <PropertyDossierModal propertyId={navigation.propertyForDossierId} onClose={() => navigation.setPropertyForDossierId(null)} onSaved={workspace.reloadInventory} />}
      {navigation.isAddPropertyOpen && <AddPropertyModal onClose={() => navigation.setIsAddPropertyOpen(false)} onCreate={async input => {
        const id = await workspace.handleAddProperty(input);
        navigation.setSelectedBuildingId(id);navigation.selectTab('properties');
      }} />}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          tenant={tenants.find((t) => t.id === selectedRoom.currentTenantId && t.roomId === selectedRoom.id)}
          contract={contracts.find((c) => c.roomId === selectedRoom.id)}
          latestInvoice={invoices.find((i) => i.roomId === selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onOpenInvoiceModal={(inv) => {
            setSelectedRoom(null);
            setSelectedInvoice(inv);
          }}
          onCheckOut={handleCheckOut}
          onReserveEscrow={handleReserveEscrow}
          onPublication={workspace.handlePublication}
          onOpenEdit={(r) => {
            setSelectedRoom(null);
            setRoomToEdit(r);
          }}
        />
      )}

      {roomToEdit && (
        <EditRoomModal
          room={roomToEdit}
          onClose={() => setRoomToEdit(null)}
          onUpdateBasic={workspace.handleUpdateBasic}
          onUpdateSensitive={workspace.handleUpdateSensitive}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={workspace.handleMarkPaid}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          tenancies={workspace.tenancies}
          utilityReadings={workspace.utilityReadings}
          initialContractId={navigation.targetInvoiceContractId}
          initialRoomId={navigation.targetInvoiceRoomId}
          onClose={() => {
            setIsCreateInvoiceOpen(false);
            navigation.setTargetInvoiceContractId(null);
            navigation.setTargetInvoiceRoomId(null);
          }}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {isAddRoomOpen && (
        availableProperties.length ? <AddRoomModal buildings={availableProperties} initialPropertyId={navigation.selectedBuildingId} onClose={() => setIsAddRoomOpen(false)} onAddRoom={handleAddRoom} />
        : <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Thêm căn cho thuê" className="bg-white rounded-xl p-6 max-w-md space-y-4"><h2 className="font-bold">Thêm tài sản cho thuê</h2><p className="text-sm">Chưa có tài sản phù hợp trong phạm vi đang chọn để thêm căn. Tài sản cho thuê nguyên căn chỉ có một căn; hãy chọn tài sản gồm nhiều căn/phòng hoặc thêm tài sản mới.</p><button onClick={() => { setIsAddRoomOpen(false);navigation.setIsAddPropertyOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Thêm tài sản cho thuê</button><button onClick={() => setIsAddRoomOpen(false)} className="ml-3 underline">Đóng</button></section></div>
      )}
</>;
}

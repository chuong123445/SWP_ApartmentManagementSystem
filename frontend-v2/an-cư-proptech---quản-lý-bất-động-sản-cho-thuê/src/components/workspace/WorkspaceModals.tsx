import type { RentalWorkspace } from '@/hooks/useRentalWorkspace';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { RoomDetailModal } from '@/components/rooms/RoomDetailModal';
import { AddRoomModal } from '@/components/rooms/AddRoomModal';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal';

export function WorkspaceModals({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const { selectedRoom, selectedInvoice, setSelectedRoom, setSelectedInvoice, rooms, tenants, contracts, invoices,
    config, handleCheckOut, handleReserveEscrow, handleMarkPaid, handleCreateInvoice, handleAddRoom } = workspace;
  const { isAddRoomOpen, setIsAddRoomOpen, isCreateInvoiceOpen, setIsCreateInvoiceOpen } = navigation;
  return <>      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          tenant={tenants.find((t) => t.id === selectedRoom.currentTenantId)}
          contract={contracts.find((c) => c.roomId === selectedRoom.id)}
          latestInvoice={invoices.find((i) => i.roomId === selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onOpenInvoiceModal={(inv) => {
            setSelectedRoom(null);
            setSelectedInvoice(inv);
          }}
          onCheckOut={handleCheckOut}
          onReserveEscrow={handleReserveEscrow}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          config={config}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={handleMarkPaid}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          rooms={rooms}
          tenants={tenants}
          config={config}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {isAddRoomOpen && (
        <AddRoomModal buildings={workspace.buildings} onClose={() => setIsAddRoomOpen(false)} onAddRoom={handleAddRoom} />
      )}
</>;
}

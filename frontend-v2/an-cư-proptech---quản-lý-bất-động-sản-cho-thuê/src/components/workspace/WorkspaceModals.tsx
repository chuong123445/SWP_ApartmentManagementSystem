import { useEffect, useState } from 'react';
import type { RentalWorkspace } from '@/hooks/useRentalWorkspace';
import type { WorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { RoomDetailModal } from '@/components/rooms/RoomDetailModal';
import { AddRoomModal } from '@/components/rooms/AddRoomModal';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';
import { PropertyDossierModal } from '@/components/property/PropertyDossierModal';
import { RequireOwnerIdentityModal } from '@/components/property/RequireOwnerIdentityModal';
import { getIdentity } from '@/services/identity/identityService';
import type { IdentityProfile } from '@/types/identity';
import { Loader2 } from 'lucide-react';

export function WorkspaceModals({ workspace, navigation }: { workspace: RentalWorkspace; navigation: WorkspaceNavigation }) {
  const { selectedRoom, selectedInvoice, setSelectedRoom, setSelectedInvoice, rooms, tenants, contracts, invoices,
    config, handleCheckOut, handleReserveEscrow, handleMarkPaid, handleCreateInvoice, handleAddRoom } = workspace;
  const { isAddRoomOpen, setIsAddRoomOpen, isCreateInvoiceOpen, setIsCreateInvoiceOpen } = navigation;
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null | undefined>(undefined);
  const [checkingIdentity, setCheckingIdentity] = useState(false);

  useEffect(() => {
    let active = true;
    setCheckingIdentity(true);
    getIdentity()
      .then(profile => {
        if (active) setIdentityProfile(profile);
      })
      .catch(() => {
        if (active) setIdentityProfile(null);
      })
      .finally(() => {
        if (active) setCheckingIdentity(false);
      });
    return () => { active = false; };
  }, [navigation.isAddPropertyOpen]);

  const hasIdentity = Boolean(identityProfile && identityProfile.documentNumber);
  const availableProperties = workspace.buildings.filter(p => (navigation.selectedBuildingId === 'all' || p.id === navigation.selectedBuildingId) && (p.rentalMode !== 'SINGLE_UNIT' || p.totalRooms === 0));
  return <>
      {navigation.propertyForDossierId && <PropertyDossierModal propertyId={navigation.propertyForDossierId} onClose={() => navigation.setPropertyForDossierId(null)} onSaved={workspace.reloadInventory} />}
      {navigation.isAddPropertyOpen && (
        checkingIdentity && identityProfile === undefined ? (
          <div role="status" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Đang kiểm tra thông tin danh tính...</span>
            </div>
          </div>
        ) : !hasIdentity ? (
          <RequireOwnerIdentityModal onClose={() => navigation.setIsAddPropertyOpen(false)} />
        ) : (
          <AddPropertyModal onClose={() => navigation.setIsAddPropertyOpen(false)} onCreate={async input => {
            const id = await workspace.handleAddProperty(input);
            navigation.setSelectedBuildingId(id);navigation.selectTab('properties');
          }} />
        )
      )}
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
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          tenancies={workspace.tenancies}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {isAddRoomOpen && (
        availableProperties.length ? <AddRoomModal buildings={availableProperties} initialPropertyId={navigation.selectedBuildingId} onClose={() => setIsAddRoomOpen(false)} onAddRoom={handleAddRoom} />
        : <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Thêm căn cho thuê" className="bg-white rounded-xl p-6 max-w-md space-y-4"><h2 className="font-bold">Thêm tài sản cho thuê</h2><p className="text-sm">Chưa có tài sản phù hợp trong phạm vi đang chọn để thêm căn. Tài sản cho thuê nguyên căn chỉ có một căn; hãy chọn tài sản gồm nhiều căn/phòng hoặc thêm tài sản mới.</p><button onClick={() => { setIsAddRoomOpen(false);navigation.setIsAddPropertyOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Thêm tài sản cho thuê</button><button onClick={() => setIsAddRoomOpen(false)} className="ml-3 underline">Đóng</button></section></div>
      )}
</>;
}

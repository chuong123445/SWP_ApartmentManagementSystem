import {Navigate} from 'react-router';
// Đường dẫn cũ dẫn tới lựa chọn theo từng tài sản, không nâng quyền bằng consent.
export function OwnerUpgradePage(){return <Navigate to="/account/properties/new" replace/>;}

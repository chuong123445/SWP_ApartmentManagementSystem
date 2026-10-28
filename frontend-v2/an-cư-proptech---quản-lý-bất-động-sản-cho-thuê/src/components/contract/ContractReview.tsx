import type { ContractParty, ContractSnapshot, ContractTerms } from '@/types/contract';
import { formatRent } from '@/utils/format';
const missing = 'Chưa có dữ liệu';
export function ReviewFields({ fields }: { fields: [string, string | number | null | undefined][] }) {
  return <dl className="grid sm:grid-cols-2 gap-4 text-sm">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500 text-xs mb-1">{label}</dt><dd className="font-medium text-slate-900 whitespace-pre-wrap break-words">{value ?? missing}</dd></div>)}</dl>;
}
export function PartyReview({ party, title }: { party: ContractParty; title: string }) {
  return <section className="rounded-xl border border-slate-200 p-4 space-y-4"><h3 className="font-bold">{title}</h3><ReviewFields fields={[
    ['Họ và tên', party.fullName], ['Email', party.email], ['Số điện thoại', party.phone], ['Ngày sinh', party.dateOfBirth], ['Địa chỉ sinh sống / liên hệ', party.address], ['Xác thực email', party.emailVerified ? 'Đã xác thực email' : 'Chưa xác thực email'],
    ['Số căn cước công dân', party.documentNumber], ['Ngày cấp căn cước', party.documentIssueDate], ['Nơi cấp căn cước', party.documentIssuePlace], ['Địa chỉ trên căn cước', party.permanentAddress],
    ['Danh tính', party.identityVerificationStatus === 'VERIFIED' ? 'Đã xác thực qua VNeID' : party.identityVerificationStatus === 'NOT_VERIFIED' ? 'Chưa xác minh danh tính' : null],
  ]} />{party.localFixture && <p className="text-sm text-amber-900 bg-amber-50 rounded-lg p-3">Thông tin căn cước mẫu — chỉ dùng minh họa, không có giá trị xác minh hoặc ký kết thực tế.</p>}<p className="text-xs text-slate-500">{party.identityVerificationStatus==='VERIFIED'?'Căn cước được ghi nhận từ luồng VNeID mô phỏng tại thời điểm tạo bản nháp. Trường nguồn chưa cung cấp được hiển thị chưa có dữ liệu.':'Thông tin lấy từ hồ sơ đã lưu tại thời điểm tạo bản nháp. Email xác nhận quyền sử dụng email; hồ sơ căn cước tự khai chưa được kiểm tra eKYC.'} Ảnh giấy tờ không được đưa vào hợp đồng.</p></section>;
}
export function AssetReview({ snapshot }: { snapshot: ContractSnapshot }) {
  const a = snapshot.asset;
  return <section className="rounded-xl border border-slate-200 p-4 space-y-4"><h3 className="font-bold">Tài sản cho thuê</h3><ReviewFields fields={[
    ['Tài sản', a.propertyName], ['Căn hộ', a.title], ['Số căn hộ', a.roomNumber], ['Địa chỉ', a.address], ['Tỉnh / thành phố', a.city], ['Quận / huyện', a.district], ['Phường / xã', a.ward], ['Diện tích (m²)', a.areaM2], ['Tầng', a.floor], ['Phòng ngủ', a.bedrooms], ['Phòng tắm', a.bathrooms], ['Tiện nghi đã lưu', a.amenities.join(', ') || null],
    ['Duyệt tài sản', a.approvalStatus === 'APPROVED' ? 'Đã được duyệt' : a.approvalStatus], ['Quyền khai thác trong hồ sơ', a.exploitationRight === 'OWNERSHIP' ? 'Sở hữu' : a.exploitationRight === 'AUTHORIZATION' ? 'Ủy quyền / khai thác' : a.exploitationRight==='SUBLEASE'?'Cho thuê lại':null],
    ['Căn cứ quyền khai thác', a.exploitationRightDescription], ['Số giấy chứng nhận', a.certificateNumber], ['Ngày cấp giấy chứng nhận', a.certificateIssueDate], ['Nơi cấp giấy chứng nhận', a.certificateIssuePlace],
  ]} />{a.localFixture && <p className="text-sm text-amber-900 bg-amber-50 rounded-lg p-3">Giấy chứng nhận và quyền khai thác mẫu — chỉ dùng minh họa; không phải bằng chứng sở hữu đã được kiểm tra.</p>}<p className="text-xs text-slate-500">Các thông tin lấy từ căn hộ và hồ sơ tài sản được duyệt tại thời điểm tạo bản nháp. Ảnh chứng từ vẫn được giữ riêng tư.</p></section>;
}
export function ReceivingAccountReview({ snapshot }: { snapshot: ContractSnapshot }) {
  const bank = snapshot.receivingAccount;
  return <section className="rounded-xl border border-slate-200 p-4 space-y-3"><h3 className="font-bold">Tài khoản nhận tiền đã lưu</h3>{bank ? <ReviewFields fields={[
    ['Ngân hàng', bank.bank], ['Số tài khoản', bank.accountNumber], ['Chủ tài khoản', bank.accountHolderName],
  ]} /> : <p className="text-sm text-slate-500">Chưa có tài khoản nhận tiền trong hồ sơ tài sản được duyệt.</p>}</section>;
}
export function ContractReview({ snapshot, terms, number, status = 'DRAFT' }: { snapshot: ContractSnapshot; terms: ContractTerms; number?: string; status?: string }) {
  return <article id="contract-preview" className="space-y-5 break-words"><div className="text-center space-y-2"><h2 className="text-xl font-bold">HỢP ĐỒNG THUÊ CĂN HỘ</h2><p className="text-xs text-slate-500 break-all">{number ?? 'Số hợp đồng được tạo khi lưu bản nháp'}</p><p className="text-sm text-amber-800">{status === 'DRAFT' ? 'Bản nháp — chưa ký' : status === 'ENDED' ? 'Đã kết thúc' : 'Đang hiệu lực'}</p></div>
    <PartyReview party={snapshot.owner} title="Bên cho thuê (Bên A)" /><PartyReview party={snapshot.customer} title="Bên thuê (Bên B)" /><AssetReview snapshot={snapshot} />
    <section className="border border-slate-200 rounded-xl p-4 space-y-4"><h3 className="font-bold">Điều kiện thuê</h3><ReviewFields fields={[
      ['Bắt đầu', terms.startDate], ['Kết thúc', terms.endDate], ['Tiền thuê / tháng (VND)', formatRent(terms.monthlyRent)], ['Đặt cọc (VND)', formatRent(terms.deposit)], ['Ngày thanh toán mỗi tháng', terms.paymentDay], ['Phương thức thanh toán', terms.paymentMethod], ['Đơn giá điện (VND/kWh)', formatRent(terms.electricityUnitPrice)], ['Đơn giá nước (VND/m³)', formatRent(terms.waterUnitPrice)], ['Mục đích thuê', terms.usagePurpose],
    ]} /></section><ReceivingAccountReview snapshot={snapshot} />
    <section className="space-y-4"><h3 className="font-bold">Điều khoản chi tiết</h3>{terms.clauses.map((c, i) => <section key={i} className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold">Điều {i + 1}. {c.title}</h4><p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p></section>)}</section>
    <p className="text-xs text-slate-500">Hai bên rà soát nội dung trước khi ký. Bản nháp chưa kích hoạt quan hệ thuê; chức năng ký số sẽ được mở khi dịch vụ ký được cấu hình.</p>
  </article>;
}

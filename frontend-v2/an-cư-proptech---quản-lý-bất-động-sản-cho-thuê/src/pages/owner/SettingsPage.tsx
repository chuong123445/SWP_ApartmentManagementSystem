import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, QrCode, Building, CreditCard, RotateCcw } from 'lucide-react';
import { SystemConfig } from '@/types';

interface SettingsPageProps {
  config: SystemConfig;
  onSaveConfig: (cfg: SystemConfig) => void;
  onResetData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onSaveConfig,
  onResetData,
}) => {
  const [electricPrice, setElectricPrice] = useState(config.electricPrice.toString());
  const [waterPrice, setWaterPrice] = useState(config.waterPrice.toString());
  const [internetPrice, setInternetPrice] = useState(config.internetPrice.toString());
  const [garbagePrice, setGarbagePrice] = useState(config.garbagePrice.toString());
  const [bankName, setBankName] = useState(config.bankName);
  const [bankAccount, setBankAccount] = useState(config.bankAccount);
  const [accountHolder, setAccountHolder] = useState(config.accountHolder);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      electricPrice: Number(electricPrice) || 3800,
      waterPrice: Number(waterPrice) || 28000,
      internetPrice: Number(internetPrice) || 100000,
      garbagePrice: Number(garbagePrice) || 50000,
      bankName,
      bankAccount,
      accountHolder,
      trustGuardEscrowAccount: config.trustGuardEscrowAccount || 'MBBANK-ESCROW-88899977',
      trustGuardFeePercent: config.trustGuardFeePercent || 1.5,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const previewQrUrl = `https://img.vietqr.io/image/${bankName}-${bankAccount}-compact2.png?amount=5000000&addInfo=TEST%20VIETQR&accountName=${encodeURIComponent(
    accountHolder
  )}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Cài Đặt Hệ Thống & Đơn Giá Tiện Ích</span>
          </h1>

        </div>

        <button
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn khôi phục lại dữ liệu demo mặc định ban đầu?')) {
              onResetData();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi Phục Dữ Liệu Demo Gốc</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Đơn giá tiện ích */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <span>1. Đơn Giá Dịch Vụ & Tiện Ích Áp Dụng Cho Khách Thuê</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Giá Điện Sinh Hoạt (đ / kWh)
              </label>
              <input
                type="number"
                value={electricPrice}
                onChange={(e) => setElectricPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Giá Nước Sinh Hoạt (đ / m³)
              </label>
              <input
                type="number"
                value={waterPrice}
                onChange={(e) => setWaterPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Internet Cáp Quang (đ / phòng / tháng)
              </label>
              <input
                type="number"
                value={internetPrice}
                onChange={(e) => setInternetPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Phí Vệ Sinh & Rác (đ / phòng / tháng)
              </label>
              <input
                type="number"
                value={garbagePrice}
                onChange={(e) => setGarbagePrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: VietQR Bank Config */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <span>2. Tài Khoản Ngân Hàng Nhận Tiền Thuê Qua Mã VietQR</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngân hàng thụ hưởng</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="MBBANK">MBBank (Ngân Hàng Quân Đội)</option>
                  <option value="VCB">Vietcombank (Ngoại Thương Việt Nam)</option>
                  <option value="ICB">VietinBank (Công Thương)</option>
                  <option value="TCB">Techcombank (Kỹ Thương)</option>
                  <option value="BIDV">BIDV (Đầu Tư & Phát Triển)</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="VPB">VPBank (Việt Nam Thịnh Vượng)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Số tài khoản ngân hàng
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên chủ tài khoản (In hoa không dấu)
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live QR Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Xem trước mẫu VietQR
              </span>
              <img
                src={previewQrUrl}
                alt="QR Preview"
                className="w-32 h-32 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <span className="text-[11px] text-slate-400 mt-2">
                Tự động điền số tiền & nội dung phòng khi in hóa đơn
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Đã cập nhật cài đặt thành công!
            </span>
          )}
          <button
            type="submit"
            id="btn-save-settings"
            className="ml-auto flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Thay Đổi Cài Đặt</span>
          </button>
        </div>
      </form>
    </div>
  );
};

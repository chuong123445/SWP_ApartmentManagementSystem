import { useEffect, useRef, useState } from 'react';
import { Zap, RefreshCw, Save, ReceiptText, Settings } from 'lucide-react';
import type { Tenancy, BillingContext } from '@/types/billing';
import { getBillingContext, saveMeterReadings, billingMoney } from '@/services/billing/billingService';
import '@/styles/operations.css';

function MeterCard({ tenancy, onInvoice }: { tenancy:Tenancy;onInvoice:(id:string)=>void }) {
  const [context,setContext]=useState<BillingContext|null>(null);
  const [electricity,setElectricity]=useState('');const [water,setWater]=useState('');
  const [source,setSource]=useState('CONTRACT');const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [revision,setRevision]=useState(0);
  const [notice,setNotice]=useState('');const form=useRef<HTMLFormElement>(null);
  const install=(c:BillingContext)=>{setContext(c);setElectricity(c.savedReading?.electricityEndReading??'');setWater(c.savedReading?.waterEndReading??'');setSource(c.savedReading?'SAVED':'CONTRACT');};
  useEffect(()=>{let active=true;setLoading(true);setError('');setContext(null);setNotice('');
    getBillingContext(tenancy.id).then(c=>{if(active)install(c);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[tenancy.id,revision]);
  const propertyRates=source==='PROPERTY';
  const tariff=context&&(source==='SAVED'?context:propertyRates?context.propertyTariff:context.contractTariff??context);
  const perPerson=tariff?.waterBillingMode==='PER_PERSON';
  const dirty=!!context&&(!context.savedReading||electricity!==context.savedReading.electricityEndReading||(!perPerson&&water!==context.savedReading.waterEndReading)||source!=='SAVED');
  const electricUsage=context&&electricity!==''?Number(electricity)-Number(context.electricityStartReading):null;
  const waterUsage=context&&water!==''?Number(water)-Number(context.waterStartReading):null;
  const estimate=tariff&&electricUsage!==null&&electricUsage>=0&&(perPerson||(waterUsage!==null&&waterUsage>=0))?electricUsage*Number(tariff.electricityUnitPrice)+(perPerson?(context?.occupantCount??1):waterUsage!)*Number(tariff.waterUnitPrice):null;
  const save=async()=>{
    if(!context||saving||!form.current?.reportValidity())return;
    setSaving(true);setError('');setNotice('');
    try{const result=await saveMeterReadings(tenancy.id,{period:context.period,baselineVersion:context.baselineVersion,electricityEndReading:electricity,waterEndReading:perPerson?context.waterStartReading:water,applyPropertyRates:propertyRates,keepSavedTariff:source==='SAVED',settingsVersion:propertyRates?context.propertyTariff?.version:undefined});install(result);setNotice('Đã chốt và lưu chỉ số. Hóa đơn sẽ dùng dữ liệu này.');}
    catch(e){setError(e instanceof Error?e.message:'Không thể lưu chỉ số.');}finally{setSaving(false);}
  };
  return <article className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4" aria-label={'Chốt chỉ số '+tenancy.roomNumber}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-lg">{tenancy.roomNumber} · {tenancy.propertyName}</h2><p className="text-sm text-slate-500">{tenancy.customerName}</p></div><button type="button" className="op-button" disabled={saving||loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={14}/>Tải lại dữ liệu</button></div>
    {loading&&<p role="status">Đang tải kỳ, chỉ số và đơn giá...</p>}
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {context&&<form ref={form} onSubmit={e=>{e.preventDefault();void save();}} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm"><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 font-semibold">Kỳ {context.period}</span>{context.savedReading&&<span className="text-emerald-700">Đã chốt · {new Date(context.savedReading.savedAt).toLocaleString('vi-VN')}</span>}</div>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-semibold">Nguồn đơn giá<select aria-label="Nguồn đơn giá" value={source} onChange={e=>{setSource(e.target.value);setNotice('');}} className="block mt-2 w-full rounded-lg border border-slate-200 p-3"><option value="CONTRACT">Theo hợp đồng đã ký</option>{context.savedReading&&<option value="SAVED">Giữ đơn giá đã chốt của kỳ này</option>}<option value="PROPERTY" disabled={!context.propertyTariff}>Áp dụng đơn giá cài đặt cho kỳ này</option></select></label>
        {!context.propertyTariff&&<p className="text-sm text-slate-500">Tài sản chưa có đơn giá cài đặt. Hiện sử dụng giá hợp đồng.</p>}
        {tariff&&<div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1"><p>Điện: <strong>{billingMoney(tariff.electricityUnitPrice)}/kWh</strong></p><p>Nước: <strong>{billingMoney(tariff.waterUnitPrice)}/{perPerson?'người/tháng':'m³'}</strong>{perPerson&&(' · '+context.occupantCount+' người')}</p><p>Internet: {billingMoney(tariff.internetFee??'0')} · Vệ sinh/rác: {billingMoney(tariff.garbageFee??'0')}</p>{propertyRates&&<p className="text-amber-800 pt-2">Chốt lại sẽ áp dụng đơn giá cài đặt đang hiển thị cho kỳ {context.period}. Hợp đồng và hóa đơn cũ giữ nguyên.</p>}</div>}
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Chỉ số điện mới<span className="block text-xs text-slate-500 font-normal mt-1">Đầu kỳ: {context.electricityStartReading} kWh</span><input aria-label="Chỉ số điện mới" required type="number" min={context.electricityStartReading} max="9999999999999.99" step="0.01" value={electricity} onChange={e=>{setElectricity(e.target.value);setNotice('');}} className="mt-2 w-full border border-slate-200 rounded-lg p-3"/></label>
          {perPerson?<div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">Nước theo người: không cần nhập chỉ số đồng hồ.</div>:<label className="text-sm font-semibold">Chỉ số nước mới<span className="block text-xs text-slate-500 font-normal mt-1">Đầu kỳ: {context.waterStartReading} m³</span><input aria-label="Chỉ số nước mới" required type="number" min={context.waterStartReading} max="9999999999999.99" step="0.01" value={water} onChange={e=>{setWater(e.target.value);setNotice('');}} className="mt-2 w-full border border-slate-200 rounded-lg p-3"/></label>}</div>
      </fieldset>
      {estimate!==null&&<p className="text-sm">Tạm tính điện + nước: <strong>{estimate.toLocaleString('vi-VN')} đ</strong><span className="block text-xs text-slate-500">Chưa gồm tiền thuê, internet và vệ sinh. Tổng chính thức do máy chủ tính khi lập hóa đơn.</span></p>}
      {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4"><button type="submit" disabled={saving} className="op-button op-button-primary"><Save size={15}/>{saving?'Đang lưu...':'Lưu & chốt chỉ số'}</button><button type="button" disabled={saving||dirty} onClick={()=>onInvoice(tenancy.id)} className="op-button disabled:opacity-50"><ReceiptText size={15}/>Lập hóa đơn từ chỉ số đã chốt</button></div>
      {dirty&&<p className="text-xs text-slate-500">Lưu chỉ số trước khi lập hóa đơn.</p>}
    </form>}
  </article>;
}
export function UtilitiesPage({tenancies,onInvoice,onSettings}:{tenancies:Tenancy[];onInvoice:(id:string)=>void;onSettings:()=>void}){
  const active=tenancies.filter(c=>c.status==='ACTIVE');
  return <section className="operations-page space-y-5" aria-label="Chốt điện nước"><header className="op-heading"><div className="op-title-group"><span className="op-heading-icon"><Zap size={22}/></span><div><h1>Chỉ số điện nước</h1><p>Chốt một lần theo kỳ. Hóa đơn tự lấy chỉ số và đơn giá đã lưu.</p></div></div><button type="button" className="op-button" onClick={onSettings}><Settings size={15}/>Cài đặt đơn giá</button></header>
    {!active.length?<p className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">Chưa có hợp đồng đang hoạt động tại tài sản đang chọn để chốt chỉ số.</p>:active.map(c=><MeterCard key={c.id} tenancy={c} onInvoice={onInvoice}/>)}
  </section>;
}

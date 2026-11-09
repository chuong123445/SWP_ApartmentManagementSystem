import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, Droplets, RefreshCw, Save, ReceiptText, Settings } from 'lucide-react';
import type { Tenancy, BillingContext, BillingTariff } from '@/types/billing';
import { getBillingContext, saveMeterReadings, billingMoney } from '@/services/billing/billingService';
import '@/styles/operations.css';
import '@/styles/utilities.css';
type Tariff=Pick<BillingTariff,'electricityUnitPrice'|'waterUnitPrice'|'waterBillingMode'>;
function MeterRow({tenancy,onInvoice,onTariff,revision}:{tenancy:Tenancy;onInvoice:(id:string)=>void;onTariff:(id:string,tariff:Tariff|null)=>void;revision:number}){
 const [context,setContext]=useState<BillingContext|null>(null);
 const [electricity,setElectricity]=useState('');const [water,setWater]=useState('');
 const [source,setSource]=useState('CONTRACT');const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [retry,setRetry]=useState(0);const [notice,setNotice]=useState('');
 const electricInput=useRef<HTMLInputElement>(null);const waterInput=useRef<HTMLInputElement>(null);
 const install=(c:BillingContext)=>{setContext(c);setElectricity(c.savedReading?.electricityEndReading??'');setWater(c.savedReading?.waterEndReading??'');setSource(c.savedReading?'SAVED':'CONTRACT');};
 useEffect(()=>{let active=true;setLoading(true);setError('');setContext(null);setNotice('');
 getBillingContext(tenancy.id).then(c=>{if(active)install(c);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[tenancy.id,revision,retry]);
 const propertyRates=source==='PROPERTY';
 const tariff=context&&(source==='SAVED'?context:propertyRates?context.propertyTariff:context.contractTariff??context);
 useEffect(()=>{const t=context&&(source==='SAVED'?context:source==='PROPERTY'?context.propertyTariff:context.contractTariff??context);onTariff(tenancy.id,t?{electricityUnitPrice:t.electricityUnitPrice,waterUnitPrice:t.waterUnitPrice,waterBillingMode:t.waterBillingMode??'METERED'}:null);},[context,source,onTariff,tenancy.id]);
 const perPerson=tariff?.waterBillingMode==='PER_PERSON';
 const dirty=!!context&&(!context.savedReading||electricity!==context.savedReading.electricityEndReading||(!perPerson&&water!==context.savedReading.waterEndReading)||source!=='SAVED');
 const eUsage=context&&electricity!==''?Number(electricity)-Number(context.electricityStartReading):null;
 const wUsage=perPerson?context?.occupantCount??1:context&&water!==''?Number(water)-Number(context.waterStartReading):null;
 const eCost=tariff&&eUsage!==null&&eUsage>=0?eUsage*Number(tariff.electricityUnitPrice):null;
 const wCost=tariff&&wUsage!==null&&wUsage>=0?wUsage*Number(tariff.waterUnitPrice):null;
 const total=eCost!==null&&wCost!==null?eCost+wCost:null;
 const money=(n:number|null)=>n===null?'—':n.toLocaleString('vi-VN')+' đ';
 const save=async()=>{if(!context||saving||!electricInput.current?.reportValidity()||(!perPerson&&!waterInput.current?.reportValidity()))return;
 setSaving(true);setError('');setNotice('');try{const c=await saveMeterReadings(tenancy.id,{period:context.period,baselineVersion:context.baselineVersion,electricityEndReading:electricity,waterEndReading:perPerson?context.waterStartReading:water,applyPropertyRates:propertyRates,keepSavedTariff:source==='SAVED',settingsVersion:propertyRates?context.propertyTariff?.version:undefined});install(c);setNotice('Đã chốt và lưu chỉ số. Hóa đơn sẽ dùng dữ liệu này.');}catch(e){setError(e instanceof Error?e.message:'Không thể lưu chỉ số.');}finally{setSaving(false);}};
 return <tr aria-label={'Chốt chỉ số '+tenancy.roomNumber}>
  <td><strong className="meter-room">{tenancy.roomNumber}</strong><small>{tenancy.propertyName}</small>{context&&<small>Kỳ {context.period}</small>}</td>
  <td><span className="font-medium">{tenancy.customerName}</span>{context&&<select aria-label="Nguồn đơn giá" value={source} disabled={saving} onChange={e=>{setSource(e.target.value);setNotice('');}} className="meter-source"><option value="CONTRACT">Giá hợp đồng</option>{context.savedReading&&<option value="SAVED">Giá đã chốt</option>}<option value="PROPERTY" disabled={!context.propertyTariff}>Giá cài đặt kỳ này</option></select>}</td>
  {context?<><td className="meter-electric">{context.electricityStartReading}</td>
   <td className="meter-electric"><input ref={electricInput} aria-label="Chỉ số điện mới" required type="number" min={context.electricityStartReading} max="9999999999999.99" step="0.01" value={electricity} disabled={saving} onChange={e=>{setElectricity(e.target.value);setNotice('');}}/></td>
   <td className="meter-electric meter-consumption"><strong>{eUsage===null?'—':eUsage+' kWh'}</strong><small>{money(eCost)}</small><small>{tariff&&billingMoney(tariff.electricityUnitPrice)+'/kWh'}</small></td>
   <td className="meter-water">{perPerson?'—':context.waterStartReading}</td>
   <td className="meter-water">{perPerson?<span className="meter-person">{context.occupantCount} người<small>Theo người/tháng</small></span>:<input ref={waterInput} aria-label="Chỉ số nước mới" required type="number" min={context.waterStartReading} max="9999999999999.99" step="0.01" value={water} disabled={saving} onChange={e=>{setWater(e.target.value);setNotice('');}}/>}</td>
   <td className="meter-water meter-consumption"><strong>{wUsage===null?'—':wUsage+(perPerson?' người':' m³')}</strong><small>{money(wCost)}</small><small>{tariff&&billingMoney(tariff.waterUnitPrice)+(perPerson?'/người':'/m³')}</small></td>
   <td className="meter-total"><strong>{money(total)}</strong>{context.savedReading&&!dirty&&<small className="text-emerald-700">Đã chốt</small>}</td>
   <td className="meter-actions"><div><button type="button" onClick={()=>void save()} disabled={saving} aria-label="Lưu & chốt chỉ số" className="meter-save"><Save size={13}/>{saving?'Đang lưu':'Chốt'}</button><button type="button" onClick={()=>onInvoice(tenancy.id)} disabled={saving||dirty} aria-label="Lập hóa đơn từ chỉ số đã chốt"><ReceiptText size={13}/>Hóa đơn</button></div>{notice&&<small role="status">{notice}</small>}{error&&<small role="alert">{error}</small>}</td></>:<td colSpan={8}>{loading?<span role="status">Đang tải chỉ số và đơn giá...</span>:<div className="meter-row-error"><span role="alert">{error}</span><button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>}</td>}
 </tr>;
}
export function UtilitiesPage({tenancies,onInvoice,onSettings}:{tenancies:Tenancy[];onInvoice:(id:string)=>void;onSettings:()=>void}){
 const active=tenancies.filter(c=>c.status==='ACTIVE');const [revision,setRevision]=useState(0);const [tariffs,setTariffs]=useState<Record<string,Tariff|null>>({});
 const onTariff=useCallback((id:string,tariff:Tariff|null)=>setTariffs(prev=>({...prev,[id]:tariff})),[]);
 const loaded=active.flatMap(c=>tariffs[c.id]?[tariffs[c.id]!]:[]);
 const electric=[...new Set(loaded.map(t=>billingMoney(t.electricityUnitPrice)+'/kWh'))];
 const water=[...new Set(loaded.map(t=>billingMoney(t.waterUnitPrice)+(t.waterBillingMode==='PER_PERSON'?'/người/tháng':'/m³')))];
 return <section className="operations-page utilities-page" aria-label="Chốt điện nước">
  <header className="op-heading"><div className="op-title-group"><span className="op-heading-icon"><Zap size={22}/></span><div><h1>Chỉ số điện nước</h1><p>Nhập chỉ số từng phòng. Chốt xong, hóa đơn tự lấy dữ liệu đã lưu.</p></div></div><div className="op-buttons"><button type="button" className="op-button" onClick={()=>setRevision(v=>v+1)}><RefreshCw size={15}/>Tải lại</button><button type="button" className="op-button" onClick={onSettings}><Settings size={15}/>Cài đặt đơn giá</button></div></header>
  <div className="meter-tariffs"><div className="meter-rate meter-rate-electric"><span><Zap size={22}/></span><div><strong>Đơn giá điện: {electric.length?electric.join(' · '):'Chưa có dữ liệu'}</strong><small>Đơn giá áp dụng cho các phòng bên dưới</small></div></div><div className="meter-rate meter-rate-water"><span><Droplets size={22}/></span><div><strong>Đơn giá nước: {water.length?water.join(' · '):'Chưa có dữ liệu'}</strong><small>Theo đồng hồ m³ hoặc theo người/tháng</small></div></div></div>
  {!active.length?<p className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">Chưa có hợp đồng đang hoạt động tại tài sản đang chọn để chốt chỉ số.</p>:<><div className="meter-table-wrap" role="region" aria-label="Bảng chỉ số điện nước" tabIndex={0}><table className="meter-table"><thead><tr><th>Phòng</th><th>Khách thuê</th><th className="meter-electric">Điện cũ</th><th className="meter-electric">Điện mới (nhập)</th><th className="meter-electric">Tiêu thụ (kWh)</th><th className="meter-water">Nước cũ</th><th className="meter-water">Nước mới (nhập)</th><th className="meter-water">Nước tiêu thụ</th><th>Tổng tiền Đ+N</th><th>Thao tác</th></tr></thead><tbody>{active.map(c=><MeterRow key={c.id} tenancy={c} onInvoice={onInvoice} onTariff={onTariff} revision={revision}/>)}</tbody></table></div><p className="meter-note">Tổng điện + nước chưa gồm tiền thuê và phí dịch vụ. Chọn “Giá cài đặt kỳ này” để áp dụng đơn giá tài sản; giá đã chốt được giữ riêng cho từng kỳ.</p></>}
 </section>;
}

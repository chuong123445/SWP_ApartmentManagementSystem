import {useEffect,useState} from 'react';
import {paymentApi,type TestReceipt} from '@/services/payment/sepayService';
export function useReceivedTestPayments(revision:number){
 const [items,setItems]=useState<TestReceipt[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();let running=false;
  async function refresh(){if(running||c.signal.aborted)return;running=true;try{const result=await paymentApi<TestReceipt[]>('/me/payments/sepay/test-payments','GET',undefined,c.signal);if(!c.signal.aborted){setItems(result);setError('');}}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Không thể tải phiếu thanh toán thử.');}finally{running=false;if(!c.signal.aborted)setLoading(false);}}
  void refresh();const onFocus=()=>{if(document.visibilityState==='visible')void refresh();};const timer=window.setInterval(onFocus,10000);window.addEventListener('focus',onFocus);return()=>{c.abort();window.clearInterval(timer);window.removeEventListener('focus',onFocus);};
 },[revision]);
 return {items,loading,error};
}

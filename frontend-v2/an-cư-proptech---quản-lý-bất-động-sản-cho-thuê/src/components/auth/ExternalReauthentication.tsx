import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useVneidConfig } from '@/contexts/VneidContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { beginReauthentication, confirmReauthentication, type SecurityCapabilities } from '@/services/auth/accountService';
export function ExternalReauthentication({ purpose, capabilities, onProof }: {
  purpose: 'password'|'email'|'phone'; capabilities: SecurityCapabilities; onProof: (proof: string) => void;
}) {
  const auth0=useAuth0();const {config}=useVneidConfig();
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);
  const [expiresAt,setExpiresAt]=useState('');
  useEffect(()=>{if(!expiresAt)return;const timer=window.setTimeout(()=>{onProof('');setDone(false);setError('Quyền xác thực lại đã hết hạn. Hãy xác thực lại để lưu thay đổi.');},Math.max(0,Date.parse(expiresAt)-Date.now()));return()=>window.clearTimeout(timer);},[expiresAt,onProof]);
  const [googleChallenge,setGoogleChallenge]=useState<{id:string;nonce:string}|null>(null);
  const start=async(provider:'AUTH0'|'GOOGLE')=>{
    if(busy)return;setBusy(true);setError('');setDone(false);onProof('');setGoogleChallenge(null);
    const popup=provider==='AUTH0'?window.open('','','width=500,height=650'):null;
    try{
      if(provider==='AUTH0'&&!popup)throw new Error('Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup và thử lại.');
      const challenge=await beginReauthentication(purpose);
      if(provider==='GOOGLE'){setGoogleChallenge(challenge);return;}
      await auth0.loginWithPopup({authorizationParams:{prompt:'login',max_age:0,connection:config?.connection}},{popup:popup!});
      const claims=await auth0.getIdTokenClaims();if(!claims?.__raw)throw new Error('Chưa nhận được kết quả Auth0.');
      const result=await confirmReauthentication(challenge.id,provider,claims.__raw);onProof(result.proof);setExpiresAt(result.expiresAt);setDone(true);
    }catch(e){popup?.close();setError(e instanceof Error?e.message:'Không thể xác thực lại.');}finally{setBusy(false);}
  };
  return <section className="border rounded-xl p-4 space-y-3">
    <h2 className="font-bold">Xác thực lại tài khoản</h2><p className="text-sm text-slate-600">Bạn có thể dùng cách này thay cho mật khẩu An Cư hiện tại. Đăng nhập lại bằng đúng tài khoản đã liên kết để tiếp tục. Quyền có hiệu lực 5 phút và chỉ dùng cho thao tác này.</p>
    {done?<p role="status" className="text-emerald-700">Đã xác thực lại. Bạn có thể lưu thay đổi.</p>:<div className="flex flex-wrap gap-3">
      {capabilities.providers.includes('AUTH0')&&<button type="button" disabled={busy||!config?.enabled} onClick={()=>void start('AUTH0')} className="border rounded-lg px-4 py-2 disabled:opacity-50">Xác thực lại bằng VNeID mô phỏng</button>}
      {capabilities.providers.includes('GOOGLE')&&<button type="button" disabled={busy} onClick={()=>void start('GOOGLE')} className="border rounded-lg px-4 py-2 disabled:opacity-50">Xác thực lại bằng Google</button>}
    </div>}
    {googleChallenge&&!done&&<GoogleSignInButton nonce={googleChallenge.nonce} disabled={busy} onCredential={async credential=>{
      setBusy(true);setError('');try{const result=await confirmReauthentication(googleChallenge.id,'GOOGLE',credential);onProof(result.proof);setExpiresAt(result.expiresAt);setDone(true);setGoogleChallenge(null);}catch(e){setError(e instanceof Error?e.message:'Không thể xác thực Google.');}finally{setBusy(false);}
    }}/>}
    {busy&&<p role="status">Đang xác thực lại...</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}
    {done&&<button type="button" className="underline text-sm" onClick={()=>{setDone(false);onProof('');}}>Xác thực lại lần nữa</button>}
  </section>;
}

import {useRef, useState} from 'react';
import type {OtpChallenge, SignatureOtp} from '@/services/auth/authService';
export type {SignatureOtp} from '@/services/auth/authService';
interface Props {
  disabled: boolean;
  label: string;
  request: () => Promise<OtpChallenge>;
  confirm: (otp: SignatureOtp) => Promise<void>;
}
export function SignatureOtpConfirmation({disabled, label, request, confirm}: Props) {
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const writing = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (writing.current || disabled) return;
    writing.current = true; setBusy(true); setError('');
    try {await action();}
    catch (e) {setError(e instanceof Error ? e.message : 'Chưa xác nhận được chữ ký.');}
    finally {writing.current = false; setBusy(false);}
  };
  const send = () => run(async () => {setChallenge(await request()); setCode('');});
  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {challenge ? <>
      <p role="status" className="text-sm">Đã gửi mã xác nhận chữ ký tới {challenge.maskedEmail}. Mã có hiệu lực 10 phút.</p>
      <label className="block text-sm">Mã OTP xác nhận chữ ký<input aria-label="Mã OTP xác nhận chữ ký" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy || disabled} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} className="block w-full min-w-0 rounded-lg border p-3 mt-1" /></label>
      <button type="button" disabled={busy || disabled || !/^[0-9]{6}$/.test(code)} onClick={() => void run(() => confirm({challengeId: challenge.challengeId, code}))} className="rounded-lg bg-emerald-700 text-white px-4 py-3 disabled:opacity-50">{busy ? 'Đang xác nhận…' : 'Xác nhận OTP và ký'}</button>
      <button type="button" disabled={busy || disabled} onClick={() => void send()} className="block text-sm text-emerald-800 underline">Gửi lại mã OTP ký</button>
    </> : <button type="button" disabled={busy || disabled} onClick={() => void send()} className="w-full rounded-xl py-3 px-4 bg-emerald-700 text-white font-semibold disabled:opacity-50">{busy ? 'Đang gửi OTP…' : label}</button>}
  </div>;
}

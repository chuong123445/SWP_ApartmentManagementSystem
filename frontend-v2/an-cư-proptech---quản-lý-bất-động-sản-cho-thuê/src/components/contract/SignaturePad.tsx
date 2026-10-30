import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

export function SignaturePad({ disabled, onChange }: { disabled: boolean; onChange: (image: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(false);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (context) { context.lineWidth = 2.5; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#172b25'; }
  }, []);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height };
  };
  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null; previous.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onChange(event.currentTarget.toDataURL('image/png'));
  };
  return <div className="space-y-2">
    <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
      {!ink && <span aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center text-sm text-slate-400">Dùng chuột hoặc ngón tay ký tại đây</span>}
      <canvas ref={canvas} width={900} height={280} aria-label="Khung vẽ chữ ký" className="block w-full h-48 sm:h-56 touch-none" style={{ touchAction: 'none' }}
        onPointerDown={event => {
          if (disabled || activePointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
          event.preventDefault(); activePointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId); previous.current = point(event);
        }} onPointerMove={event => {
          if (disabled || activePointer.current !== event.pointerId || !previous.current) return;
          event.preventDefault(); const next = point(event); const context = event.currentTarget.getContext('2d');
          if (context) { context.beginPath(); context.moveTo(previous.current.x, previous.current.y); context.lineTo(next.x, next.y); context.stroke(); setInk(true); }
          previous.current = next;
        }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { activePointer.current = null; previous.current = null; }} />
    </div>
    <button type="button" disabled={disabled} className="text-sm text-slate-600 underline disabled:opacity-50" onClick={() => {
      canvas.current?.getContext('2d')?.clearRect(0, 0, 900, 280); setInk(false); onChange(null);
    }}>Xóa chữ ký</button>
  </div>;
}

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PointerEvent } from 'react';
import { PenLine, Keyboard, RotateCcw } from 'lucide-react';

export interface SignaturePadProps {
  disabled: boolean;
  onChange: (image: string | null) => void;
  defaultName?: string;
}

const SIGNATURE_STYLES = [
  { id: 0, label: 'Nghệ thuật', font: '"Dancing Script", "Segoe Script", "Brush Script MT", cursive' },
  { id: 1, label: 'Phóng khoáng', font: '"Caveat", "Playwrite VN", "Lucida Handwriting", cursive' },
  { id: 2, label: 'Thanh lịch', font: '"Segoe Script", "Brush Script MT", cursive' },
];

export function SignaturePad({ disabled, onChange, defaultName }: SignaturePadProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  
  // Draw mode refs & state
  const drawCanvas = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawInk, setHasDrawInk] = useState(false);

  // Type mode state & ref
  const typeCanvas = useRef<HTMLCanvasElement>(null);
  const [typedName, setTypedName] = useState(defaultName || '');
  const [selectedStyle, setSelectedStyle] = useState(0);

  // Set up drawing canvas context
  useEffect(() => {
    const context = drawCanvas.current?.getContext('2d');
    if (context) {
      context.lineWidth = 2.5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#172b25';
    }
  }, [mode]);

  // Render typed signature onto hidden/preview canvas
  const renderTypedSignature = useCallback((name: string, styleIdx: number) => {
    const canvas = typeCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      onChange(null);
      return;
    }

    const style = SIGNATURE_STYLES[styleIdx] || SIGNATURE_STYLES[0];

    ctx.save();
    ctx.fillStyle = '#0f291e';
    ctx.strokeStyle = '#0f291e';

    // Calculate font size to fit neatly
    let fontSize = 72;
    ctx.font = `italic 600 ${fontSize}px ${style.font}`;
    let textWidth = ctx.measureText(trimmed).width;
    while (textWidth > canvas.width - 160 && fontSize > 28) {
      fontSize -= 4;
      ctx.font = `italic 600 ${fontSize}px ${style.font}`;
      textWidth = ctx.measureText(trimmed).width;
    }

    const startX = Math.max(60, (canvas.width - textWidth) / 2);
    const startY = 145;

    // Draw name text
    ctx.fillText(trimmed, startX, startY);

    // Draw decorative flourish underline
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const lineY = startY + 16;
    const endX = startX + textWidth + 25;
    ctx.moveTo(startX - 15, lineY);
    ctx.bezierCurveTo(
      startX + textWidth * 0.35, lineY + 14,
      startX + textWidth * 0.7, lineY - 6,
      endX, lineY + 4
    );
    ctx.bezierCurveTo(
      endX + 16, lineY + 10,
      endX + 30, lineY - 4,
      endX + 40, lineY - 18
    );
    ctx.stroke();

    // Subtle signature metadata label
    ctx.font = '500 16px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Chữ ký số xác nhận', startX, startY + 50);

    ctx.restore();

    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  // Re-render when typedName, selectedStyle, or mode changes
  useEffect(() => {
    if (mode === 'type') {
      renderTypedSignature(typedName, selectedStyle);
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.ready.then(() => {
          renderTypedSignature(typedName, selectedStyle);
        });
      }
    }
  }, [mode, typedName, selectedStyle, renderTypedSignature]);

  // Pointer helpers for drawing mode
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * event.currentTarget.width / rect.width,
      y: (event.clientY - rect.top) * event.currentTarget.height / rect.height,
    };
  };

  const finishDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    previous.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onChange(event.currentTarget.toDataURL('image/png'));
  };

  const clearDraw = () => {
    drawCanvas.current?.getContext('2d')?.clearRect(0, 0, 900, 280);
    setHasDrawInk(false);
    onChange(null);
  };

  const handleSwitchMode = (newMode: 'draw' | 'type') => {
    if (disabled || newMode === mode) return;
    setMode(newMode);
    if (newMode === 'draw') {
      if (hasDrawInk && drawCanvas.current) {
        onChange(drawCanvas.current.toDataURL('image/png'));
      } else {
        onChange(null);
      }
    } else {
      if (typedName.trim().length >= 2) {
        renderTypedSignature(typedName, selectedStyle);
      } else {
        onChange(null);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab selection: Vẽ chữ ký vs Gõ họ tên */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSwitchMode('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
            mode === 'draw'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <PenLine size={15} />
          <span>Vẽ chữ ký</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSwitchMode('type')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
            mode === 'type'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Keyboard size={15} />
          <span>Gõ họ tên</span>
        </button>
      </div>

      {/* Mode 1: Vẽ bằng tay/chuột */}
      {mode === 'draw' && (
        <div className="space-y-2">
          <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
            {!hasDrawInk && (
              <span aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center text-sm text-slate-400">
                Dùng chuột hoặc ngón tay ký tại đây
              </span>
            )}
            <canvas
              ref={drawCanvas}
              width={900}
              height={280}
              aria-label="Khung vẽ chữ ký"
              className="block w-full h-48 sm:h-56 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={event => {
                if (disabled || activePointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
                event.preventDefault();
                activePointer.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
                previous.current = point(event);
              }}
              onPointerMove={event => {
                if (disabled || activePointer.current !== event.pointerId || !previous.current) return;
                event.preventDefault();
                const next = point(event);
                const context = event.currentTarget.getContext('2d');
                if (context) {
                  context.beginPath();
                  context.moveTo(previous.current.x, previous.current.y);
                  context.lineTo(next.x, next.y);
                  context.stroke();
                  setHasDrawInk(true);
                }
                previous.current = next;
              }}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
              onLostPointerCapture={() => {
                activePointer.current = null;
                previous.current = null;
              }}
            />
          </div>
          <button
            type="button"
            disabled={disabled || !hasDrawInk}
            className="text-sm text-slate-600 underline disabled:opacity-50 hover:text-slate-900 inline-flex items-center gap-1"
            onClick={clearDraw}
          >
            <RotateCcw size={13} />
            Xóa chữ ký
          </button>
        </div>
      )}

      {/* Mode 2: Gõ họ tên từ bàn phím */}
      {mode === 'type' && (
        <div className="space-y-3">
          <div>
            <label htmlFor="input-typed-signature-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên của bạn để tạo chữ ký:
            </label>
            <input
              id="input-typed-signature-name"
              type="text"
              disabled={disabled}
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
            />
          </div>

          {/* Style selector pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Kiểu chữ:</span>
            {SIGNATURE_STYLES.map(style => (
              <button
                key={style.id}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedStyle(style.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  selectedStyle === style.id
                    ? 'border-brand-700 bg-brand-50 text-brand-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>

          {/* Live Signature Canvas Preview */}
          <div className="relative rounded-xl border-2 border-dashed border-brand-200 bg-slate-50 overflow-hidden">
            {typedName.trim().length < 2 && (
              <span aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center text-sm text-slate-400 p-4 text-center">
                Gõ họ và tên vào ô trên để tự động tạo chữ ký điện tử
              </span>
            )}
            <canvas
              ref={typeCanvas}
              width={900}
              height={280}
              aria-label="Xem trước chữ ký tạo từ họ tên"
              className="block w-full h-48 sm:h-56"
            />
          </div>

          <p className="text-xs text-slate-500 italic">
            Chữ ký tạo từ họ tên được chuyển thành ảnh nét vẽ và lưu trữ vào văn bản hợp đồng PDF chính thức.
          </p>
        </div>
      )}
    </div>
  );
}

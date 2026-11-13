import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetch, readApiError } from '@/services/http/client';
import { uploadPropertyImages } from '@/services/property/propertyImageService';

interface ListingFacts {
  areaM2: string | number;
  monthlyRent: string | number;
  floor?: number | null;
  maxOccupants?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  amenities?: string[];
  imageIds?: string[];
}

export function DescriptionSuggestion({ facts, photos = [], onApply }: {
  facts: ListingFacts;
  photos?: File[];
  onApply: (description: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<{ input: string; text: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const uploaded = useRef(new WeakMap<File,string>());
  const input = JSON.stringify([facts,photos.map(file=>[file.name,file.size,file.lastModified])]);
  const ready = Number(facts.areaM2) > 0 && Number(facts.monthlyRent) > 0;

  useEffect(() => () => pending.current?.abort(), []);

  async function generate() {
    if (!ready || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError('');
    setSuggestion(null);
    try {
      const imageIds = photos.length ? await Promise.all(photos.map(async file=>{
        const cached=uploaded.current.get(file);if(cached)return cached;
        const [id]=await uploadPropertyImages([file]);uploaded.current.set(file,id);return id;
      })) : facts.imageIds;
      if(controller.signal.aborted)return;
      const response = await apiFetch('/api/v1/me/listing-description/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...facts,imageIds}),
        signal: controller.signal,
      });
      if (!response.ok) throw await readApiError(response);
      const { description } = await response.json();
      if (typeof description !== 'string' || !description.trim() || description.length > 3000) {
        throw new Error('Chưa nhận được mô tả hợp lệ. Hãy thử lại.');
      }
      if (!controller.signal.aborted) setSuggestion({ input, text: description });
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : 'Không thể tạo gợi ý. Hãy thử lại.');
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <div className="mt-2 space-y-2 text-sm">
    <button type="button" disabled={!ready || loading} onClick={() => void generate()}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-800 hover:bg-brand-100 disabled:opacity-50">
      <Sparkles size={16} aria-hidden="true" />{loading ? 'Đang tạo gợi ý…' : 'AI gợi ý mô tả'}
    </button>
    <p className="text-xs text-slate-600">{ready
      ? `Gửi thông tin cho thuê và ${photos.length||facts.imageIds?.length||0} ảnh riêng của phòng này đến AI để soạn gợi ý. Kiểm tra nội dung trước khi dùng.`
      : 'Nhập diện tích và giá thuê để dùng gợi ý AI.'}</p>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {suggestion?.input === input && <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <p className="whitespace-pre-wrap break-words">{suggestion.text}</p>
      <button type="button" className="rounded-md bg-brand-700 px-3 py-2 font-semibold text-white"
        onClick={() => { onApply(suggestion.text); setSuggestion(null); }}>Dùng gợi ý</button>
    </div>}
  </div>;
}

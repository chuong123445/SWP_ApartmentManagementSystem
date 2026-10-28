import { apiFetch, readApiError } from '@/services/http/client';
export async function uploadPropertyImages(files: File[]): Promise<string[]> {
  if (files.length < 1 || files.length > 4) throw new Error('Chọn từ 1 đến 4 ảnh tài sản.');
  const body = new FormData();files.forEach(file => body.append('files', file));
  const response = await apiFetch('/api/v1/me/property-images', { method: 'POST', body });
  if (!response.ok) throw await readApiError(response);
  return (await response.json()).map((image: { id: string }) => image.id);
}

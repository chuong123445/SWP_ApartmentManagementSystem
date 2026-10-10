let accessToken: string | null = null;
let refreshHandler: (() => Promise<void>) | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code = '') { super(message); }
}

export function setAccessToken(token: string | null) { accessToken = token; }
export function setRefreshHandler(handler: (() => Promise<void>) | null) { refreshHandler = handler; }

export async function readApiError(response: Response) {
  const error = await response.json().catch(() => null);
  return new ApiError(error?.message || error?.detail || `Yêu cầu thất bại (HTTP ${response.status}).`,
    response.status, error?.code || '');
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const send = () => {
    const headers = new Headers(options?.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers, credentials: 'same-origin' });
  };
  let response = await send();
  if (response.status === 401 && refreshHandler) {
    await refreshHandler();
    response = await send();
  }
  return response;
}

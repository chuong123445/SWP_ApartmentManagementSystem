import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getApartments, getApartment } from '@/services/apartments/apartmentService';
import { submitRentalRequest, getOwnerRentalRequests } from '@/services/rental/rentalService';
import { ApiError, setAccessToken } from '@/services/http/client';
import { loginDestination } from '@/utils/navigation';
import type { AuthUser } from '@/types/auth';

const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; setAccessToken(null); });
test('public search encodes filters/page and does not depend on an access JWT', async () => {
  setAccessToken('expired-token');
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url), 'http://localhost');
    assert.equal(parsed.searchParams.get('q'), 'căn hộ & studio');
    assert.equal(parsed.searchParams.get('maxRent'), '5000000');
    assert.equal(parsed.searchParams.get('page'), '0');
    assert.equal(new Headers(options?.headers).has('Authorization'), false);
    return Response.json({ items: [], page: 0, size: 6, totalElements: 0, totalPages: 0 });
  };
  await getApartments({ q: 'căn hộ & studio', maxRent: '5000000', page: 0 });
});
test('rental submission sends only a message and authenticated principal is server-derived', async () => {
  setAccessToken('customer-jwt');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/apartments/apartment-id/rental-requests');
    assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer customer-jwt');
    assert.deepEqual(JSON.parse(options!.body as string), { message: 'Tôi muốn thuê' });
    return Response.json({ id: 'request-id', status: 'PENDING' }, { status: 201 });
  };
  assert.equal((await submitRentalRequest('apartment-id', 'Tôi muốn thuê')).status, 'PENDING');
});
test('request rejection remains an error and owner inbox never sends an ownerId', async () => {
  globalThis.fetch = async url => {
    if (String(url).includes('/owner/')) {
      assert.equal(String(url), '/api/v1/owner/rental-requests?page=1&size=10&status=PENDING');
      return Response.json({ items: [] });
    }
    return Response.json({ code: 'CONTACT_NOT_VERIFIED', message: 'Cần xác minh' }, { status: 403 });
  };
  await assert.rejects(submitRentalRequest('id', ''), (error: ApiError) => error.status === 403 && error.code === 'CONTACT_NOT_VERIFIED');
  await getOwnerRentalRequests(1, 'PENDING');
});
test('hidden/missing apartment error is surfaced instead of showing mock details', async () => {
  globalThis.fetch = async () => Response.json({ code: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy căn hộ' }, { status: 404 });
  await assert.rejects(getApartment('id'), /Không tìm thấy căn hộ/);
});
test('login redirects only to supported local pages', () => {
  const user = { roles: ['CUSTOMER'] } as AuthUser;
  assert.equal(loginDestination(user, 'https://external.example'), '/');
  assert.equal(loginDestination(user, '//external.example'), '/');
  assert.equal(loginDestination(user, '/my/rental-requests'), '/my/rental-requests');
});

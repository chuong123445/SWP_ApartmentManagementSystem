import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createRoom, getRooms } from '@/services/rooms/roomService';
import type { NewRoom } from '@/types';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const room: NewRoom = {
  roomNumber: ' P.303 ', buildingId: 'bld-1', floor: 3, area: 28,
  price: 5000000, deposit: 5000000, status: 'available',
  electricityIndex: 1200, waterIndex: 110, maxOccupants: 2,
  amenities: ['Máy lạnh'],
};

test('create sends the Java enum and no client ID; maps the saved UUID and readings', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8080/api/rooms');
    assert.equal(options?.method, 'POST');
    const payload = JSON.parse(options!.body as string);
    assert.equal('id' in payload, false);
    assert.equal(payload.status, 'AVAILABLE');
    assert.equal(payload.roomNumber, 'P.303');
    assert.equal(payload.electricityIndex, 1200);
    assert.equal(payload.waterIndex, 110);
    return Response.json({ ...payload, id: 'server-uuid' });
  };
  const saved = await createRoom('http://localhost:8080/api', room);
  assert.equal(saved.id, 'server-uuid');
  assert.equal(saved.status, 'available');
  assert.equal(saved.electricityIndex, 1200);
  assert.equal(saved.waterIndex, 110);
});

test('loading existing database rooms normalizes enums and missing optional fields', async () => {
  globalThis.fetch = async () => Response.json([
    { id: 'old-room', buildingId: 'bld-1', roomNumber: 'P.101',
      floor: 1, area: 25, price: 4500000, status: 'RENTED', amenities: null },
  ]);
  const [saved] = await getRooms('http://localhost:8080/api');
  assert.equal(saved.status, 'rented');
  assert.equal(saved.electricityIndex, 0);
  assert.equal(saved.waterIndex, 0);
  assert.equal(saved.maxOccupants, 2);
  assert.deepEqual(saved.amenities, []);
});

test('server rejection is reported instead of returning an unsaved room', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Invalid request' }, { status: 400 });
  await assert.rejects(createRoom('http://localhost:8080/api', room), /HTTP 400.*Invalid request/);
});

test('connection failures are reported so the form can remain open for retry', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(createRoom('http://localhost:8080/api', room), /Không thể kết nối máy chủ/);
});

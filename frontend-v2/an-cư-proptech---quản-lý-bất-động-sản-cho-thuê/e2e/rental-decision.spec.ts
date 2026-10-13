import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const env = new Map(
  readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
);

test('Owner can accept and reject rental requests with contract option and customer sync', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  mkdirSync('test-results/visual', { recursive: true });

  // 1. Owner login first to get their own published vacant apartment
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  ownerPage.on('pageerror', error => errors.push(error.message));

  await ownerPage.goto('/login');
  await ownerPage.getByLabel('Email', { exact: true }).fill(env.get('LOCAL_OWNER_EMAIL')!);
  await ownerPage.getByLabel('Mật khẩu', { exact: true }).fill(env.get('LOCAL_OWNER_PASSWORD')!);
  const ownerLoginPromise = ownerPage.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await ownerPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const ownerToken = (await (await ownerLoginPromise).json()).accessToken;
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
  const ownerApts = await (await ownerPage.request.get('/api/v1/owner/apartments', { headers: ownerHeaders })).json();
  const ownerAptIds = new Set(ownerApts.map((a: any) => a.id));

  // 2. Customer login
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(env.get('LOCAL_TENANT_1_EMAIL')!);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(env.get('LOCAL_TENANT_1_PASSWORD')!);
  const customerLoginPromise = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const token = (await (await customerLoginPromise).json()).accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  await expect(page).toHaveURL(/\/$/);

  const apartments = (await (await page.request.get('/api/v1/apartments?size=50')).json()).items;
  let targetApartmentId = '';
  for (const apt of apartments.filter((a: any) => a.availability === 'VACANT' && ownerAptIds.has(a.id))) {
    const active = await (await page.request.get(`/api/v1/me/apartments/${apt.id}/rental-requests`, { headers })).json();
    if (!active.length) {
      targetApartmentId = apt.id;
      break;
    }
  }
  expect(targetApartmentId).toBeTruthy();

  // 2. Customer submits first request (to test REJECT)
  const rejectMessage = `Kiểm thử từ chối ${crypto.randomUUID()}`;
  await page.goto(`/apartments/${targetApartmentId}`);
  await expect(page.getByLabel('Lời nhắn cho chủ nhà')).toBeVisible();
  await page.getByLabel('Lời nhắn cho chủ nhà').fill(rejectMessage);
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();

  try {
    await ownerPage.locator('#nav-rental_requests').click();
    await expect(ownerPage.getByRole('heading', { name: 'Yêu cầu thuê căn hộ' })).toBeVisible();

async function findRentalRequest(ownerPage: any, message: string) {
  await expect(ownerPage.getByTestId('rental-request').first()).toBeVisible();
  for (let p = 0; p < 10; p++) {
    const item = ownerPage.getByTestId('rental-request').filter({ hasText: message });
    if (await item.count() > 0) return item.first();
    const nextBtn = ownerPage.getByRole('button', { name: 'Trang sau' });
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await Promise.all([
        ownerPage.waitForResponse((r: any) => r.url().includes('/owner/rental-requests')),
        nextBtn.click(),
      ]);
      await expect(ownerPage.getByTestId('rental-request').first()).toBeVisible();
    } else {
      break;
    }
  }
  return ownerPage.getByTestId('rental-request').filter({ hasText: message }).first();
}

    const rejectItem = await findRentalRequest(ownerPage, rejectMessage);
    await expect(rejectItem).toBeVisible();
    await expect(rejectItem.getByRole('button', { name: 'Đồng ý' })).toBeVisible();
    await expect(rejectItem.getByRole('button', { name: 'Từ chối' })).toBeVisible();

    // Owner clicks "Từ chối"
    ownerPage.on('dialog', dialog => dialog.accept());
    const rejectDecisionResponse = ownerPage.waitForResponse(
      r => r.url().includes('/decisions') && r.request().method() === 'POST'
    );
    await rejectItem.getByRole('button', { name: 'Từ chối' }).click();
    expect((await rejectDecisionResponse).status()).toBe(200);

    // Verify rejection status on Owner screen
    await expect(rejectItem).toContainText('Đã từ chối');
    await expect(rejectItem.getByRole('button', { name: 'Đồng ý' })).toHaveCount(0);
    await expect(rejectItem.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);

    // 4. Customer verifies rejection sync
    await page.goto('/my/rental-requests');
    const customerRejectRow = page.getByTestId('rental-request').filter({ hasText: rejectMessage });
    await expect(customerRejectRow).toBeVisible();
    await expect(customerRejectRow).toContainText('Đã từ chối');
    await expect(customerRejectRow).toContainText('Yêu cầu thuê đã bị chủ nhà từ chối');
    await page.screenshot({ path: 'test-results/visual/customer-rejected-sync.png', fullPage: true });

    // 5. Customer submits second request on the same still-VACANT apartment (to test ACCEPT)
    const acceptMessage = `Kiểm thử chấp nhận ${crypto.randomUUID()}`;
    await page.goto(`/apartments/${targetApartmentId}`);
    await expect(page.getByLabel('Lời nhắn cho chủ nhà')).toBeVisible();
    await page.getByLabel('Lời nhắn cho chủ nhà').fill(acceptMessage);
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();

    // 6. Owner processes ACCEPT
    await ownerPage.reload();
    await ownerPage.locator('#nav-rental_requests').click();
    const acceptItem = await findRentalRequest(ownerPage, acceptMessage);
    await expect(acceptItem).toBeVisible();
    await expect(acceptItem.getByRole('button', { name: 'Đồng ý' })).toBeVisible();
    await expect(acceptItem.getByRole('button', { name: 'Từ chối' })).toBeVisible();

    const acceptDecisionResponse = ownerPage.waitForResponse(
      r => r.url().includes('/decisions') && r.request().method() === 'POST'
    );
    await acceptItem.getByRole('button', { name: 'Đồng ý' }).click();
    expect((await acceptDecisionResponse).status()).toBe(200);

    // Verify ACCEPTED status and "Tạo hợp đồng" option on Owner screen
    await expect(acceptItem).toContainText('Đã chấp nhận');
    await expect(acceptItem.getByRole('button', { name: 'Tạo hợp đồng' })).toBeVisible();
    await expect(acceptItem.getByRole('button', { name: 'Đồng ý' })).toHaveCount(0);
    await expect(acceptItem.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);

    // Mobile responsive check on owner page
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    expect(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await ownerPage.screenshot({ path: 'test-results/visual/owner-decision-mobile.png', fullPage: true });

    // 7. Customer verifies ACCEPTED sync
    await page.goto('/my/rental-requests');
    const customerAcceptRow = page.getByTestId('rental-request').filter({ hasText: acceptMessage });
    await expect(customerAcceptRow).toBeVisible();
    await expect(customerAcceptRow).toContainText('Đã chấp nhận');
    await expect(customerAcceptRow).toContainText('Chủ nhà đã chấp nhận yêu cầu thuê của bạn');
    await page.screenshot({ path: 'test-results/visual/customer-accepted-sync.png', fullPage: true });

    // Customer visits apartment detail page: availability is now CONTRACT_IN_PROGRESS
    await page.goto(`/apartments/${targetApartmentId}`);
    await expect(page.getByText('Chủ nhà đã chấp nhận yêu cầu thuê.')).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/customer-accepted-detail.png', fullPage: true });

  } finally {
    await ownerContext.close();
  }

  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';

test('Owner switches home, management and sidebar without stale home URL', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/refresh')) return route.fulfill({ json: { accessToken: 'test', tokenType: 'Bearer', expiresIn: 900, user: { id: '1', email: 'owner@example.invalid', fullName: 'Owner test', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } } });
    if (path === '/api/v1/apartments') return route.fulfill({ json: { content: [], items: [], totalPages: 0, totalElements: 0, number: 0, size: 6 } });
    if (path.endsWith('/csrf')) return route.fulfill({ json: { headerName: 'X-XSRF-TOKEN', token: 'test' } });
    if (path.endsWith('/vneid-config')) return route.fulfill({ json: { enabled: false } });
    if (path.endsWith('/notifications')) return route.fulfill({ json: { items: [], unreadCount: 0, totalElements: 0, totalPages: 0 } });
    return route.fulfill({ json: path.endsWith('/invoices') ? { items: [], content: [], totalPages: 0, totalElements: 0 } : [] });
  });
  await page.goto('/app');
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await nav.getByRole('link', { name: 'Trang chủ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tìm căn hộ theo khu vực', exact: true })).toBeVisible();
  await expect(page.locator('#select-building-sidebar')).toBeVisible();
  await page.locator('#nav-rooms').click();
  await expect(page.getByRole('heading', { name: 'Thêm tài sản cho thuê', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Trang chủ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tìm căn hộ theo khu vực', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Trang quản lý', exact: true }).click();
  await expect(page).toHaveURL(/tab=dashboard/);
  await expect(page.getByRole('heading', { name: 'Thêm tài sản cho thuê', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Trang chủ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tìm căn hộ theo khu vực', exact: true })).toBeVisible();
});

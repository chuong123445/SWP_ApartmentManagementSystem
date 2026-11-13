import { expect, test } from '@playwright/test';
import { ownerSummaryFixture } from './fixtures/ownerSummary';

for (const width of [390, 768, 1440]) {
  test(`Trang tìm nhà và tổng quan chủ nhà vừa màn hình ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const empty = { items: [], page: 0, size: 20, totalPages: 0, totalElements: 0 };
    await page.route('https://images.unsplash.com/**', route => route.fulfill({ status: 204 }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) => route.fulfill({ json: body });
      if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
      if (path.endsWith('/refresh')) return json({
        accessToken: 'fixture', expiresIn: 900,
        user: { id: '1', fullName: 'Chủ nhà mẫu', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED' },
      });
      const summary = ownerSummaryFixture(route);
      if (summary) return summary;
      if (path.endsWith('/property-groups') || path.endsWith('/invoices') ||
          path.endsWith('/invoices/additional') || path.endsWith('/maintenance-tickets')) return json(empty);
      if (path.endsWith('/notifications')) return json({ ...empty, unreadCount: 0 });
      if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'An Cư', approvalStatus: 'APPROVED' }]);
      return json([]);
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Tìm căn hộ cho thuê/ })).toBeVisible();
    await expect.poll(() => page.locator('.home-intro-photo img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Tìm kiếm', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath('trang-tim-nha.png') });

    await page.goto('/app?tab=dashboard');
    await expect(page.getByRole('heading', { name: 'Tổng quan vận hành' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Chỉ số tổng quan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cần theo dõi' })).toBeVisible();
    const main = page.locator('.management-shell main');
    expect(await main.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(await main.evaluate(element => element.clientWidth));
    await page.screenshot({ path: info.outputPath('tong-quan.png') });
    if (width < 768) await page.getByRole('button', { name: 'Menu quản lý' }).click();
    await expect(page.locator('#nav-dashboard')).toHaveAttribute('aria-current', 'page');
    await page.locator('#nav-invoices').click();
    await expect(page.getByRole('heading', { name: 'Hóa đơn người thuê' })).toBeVisible();
  });
}

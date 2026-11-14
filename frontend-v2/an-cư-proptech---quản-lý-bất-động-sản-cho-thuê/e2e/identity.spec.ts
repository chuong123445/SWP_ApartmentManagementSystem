import { test, expect } from '@playwright/test';

test('catalog shows every eligible VACANT apartment to guest', async ({ page }) => {
  const catalog = await (await page.request.get('/api/v1/apartments?size=100')).json();
  expect(catalog.items.every((item: { availability: string }) => item.availability === 'VACANT')).toBe(true);
  await page.goto('/');await expect(page.locator('.home-results [role=status]')).toHaveText(`${catalog.totalElements} căn hộ phù hợp`);
  const cards = page.getByTestId('apartment-card');
  // Current catalog is small enough for one page, but do not hardcode demo counts.
  await expect(cards).toHaveCount(Math.min(6, catalog.totalElements));
  for (const item of catalog.items.slice(0, 6)) await expect(page.locator(`.home-listings a[href="/apartments/${item.id}"]`).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

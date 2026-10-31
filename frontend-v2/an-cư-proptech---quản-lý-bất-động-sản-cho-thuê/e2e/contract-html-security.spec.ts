import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockGoogleIdentity } from './support/google-identity';

test('untrusted contract text stays inert through HTML, print and actual PDF download', async ({ page }) => {
  const pageErrors: string[] = [];
  const payloadRequests: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await mockGoogleIdentity(page);
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: false } }));
  await page.route('**/api/v1/auth/csrf', route => route.fulfill({ json: { token: 'csrf-test', headerName: 'X-XSRF-TOKEN' } }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'Chưa đăng nhập' } }));
  await page.route('**/__xss_probe__', route => { payloadRequests.push(route.request().url()); return route.fulfill({ status: 404 }); });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  const text = '<img src="/__xss_probe__" onerror="window.__xssProbe=1">';
  const contract = { id: '123', contractNumber: 'HD-SAFE', tenantId: '41', tenantName: text,
    roomId: '32', roomNumber: 'A.01', buildingName: 'Tòa kiểm thử', startDate: '2026-11-01', endDate: '2027-10-31',
    monthlyRent: 4500000, deposit: 1000000, paymentCycle: 1, status: 'active' };
  const result = await page.evaluate(async value => {
    const modulePath = '/src/utils/contractPdf.ts';
    const module = await import(modulePath);
    const root = document.createElement('div');
    root.id = 'html-security-probe';
    document.body.appendChild(root);
    root.innerHTML = module.generateContractBody(value);
    module.printContractDocument(value);
    const frame = document.querySelector('iframe')!;
    frame.contentWindow!.print = () => undefined;
    return { bodyImages: root.querySelectorAll('img').length, bodyText: root.textContent,
      printImages: frame.contentDocument!.querySelectorAll('img').length, printText: frame.contentDocument!.body.textContent };
  }, contract);
  expect(result.bodyImages).toBe(0);
  expect(result.printImages).toBe(0);
  expect(result.bodyText).toContain(text);
  expect(result.printText).toContain(text);
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(async value => {
    const modulePath = '/src/utils/contractPdf.ts';
    const module = await import(modulePath);
    await module.downloadContractPdfFile(value);
  }, contract);
  const download = await downloadPromise;
  const contents = await readFile((await download.path())!);
  expect(contents.subarray(0, 5).toString()).toBe('%PDF-');
  expect(await page.evaluate(() => (window as Window & { __xssProbe?: number }).__xssProbe)).toBeUndefined();
  expect(payloadRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

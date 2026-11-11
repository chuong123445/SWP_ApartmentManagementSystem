import {test, expect} from '@playwright/test';

for (const width of [1440, 390]) {
  test(`Password recovery verifies email OTP before setting a new password at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    let verified = false, reset = false;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const json = body => route.fulfill({json: body});
      if (path.endsWith('/csrf')) return json({headerName: 'X-XSRF-TOKEN', token: 'csrf-test'});
      if (path.endsWith('/refresh')) return route.fulfill({status: 401, json: {message: 'No session'}});
      if (path.endsWith('/vneid-config')) return json({enabled: false});
      expect(route.request().headers()['x-xsrf-token']).toBe('csrf-test');
      if (path === '/api/v1/auth/password-recovery') return json({challengeId: 'recovery', maskedEmail: 'te***@example.invalid', expiresAt: '2099-01-01T00:00:00Z'});
      if (path.endsWith('/password-recovery/verify')) {
        if (route.request().postDataJSON().code !== '123456') return route.fulfill({status: 400, json: {code: 'OTP_INVALID', message: 'Mã OTP không đúng.'}});
        verified = true;
        return json({challengeId: 'recovery', resetToken: 'proof', expiresAt: '2099-01-01T00:00:00Z'});
      }
      if (path.endsWith('/password-recovery/reset')) {
        const input = route.request().postDataJSON();
        expect(verified).toBe(true);expect(input.resetToken).toBe('proof');expect(input.newPassword).toBe(input.confirmPassword);
        expect(input).not.toHaveProperty('expiresAt');
        reset = true;return route.fulfill({status: 204});
      }
      throw new Error(`Unexpected API ${path}`);
    });
    await page.goto('/login');
    await page.getByRole('link', {name: 'Quên mật khẩu?', exact: true}).click();
    await page.getByLabel('Email', {exact: true}).fill('test@example.invalid');
    await page.getByRole('button', {name: 'Gửi mã OTP', exact: true}).click();
    await page.getByLabel('Mã OTP', {exact: true}).fill('000000');
    await page.getByRole('button', {name: 'Xác nhận OTP', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveText('Mã OTP không đúng.');expect(verified).toBe(false);
    await page.getByRole('button', {name: 'Gửi lại mã OTP', exact: true}).click();
    await page.getByLabel('Mã OTP', {exact: true}).fill('123456');
    await page.getByRole('button', {name: 'Xác nhận OTP', exact: true}).click();
    await page.getByLabel('Mật khẩu mới', {exact: true}).fill('New-password!123');
    await page.getByLabel('Xác nhận mật khẩu mới', {exact: true}).fill('Mismatch!12345');
    await page.getByRole('button', {name: 'Đặt lại mật khẩu', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveText('Mật khẩu xác nhận không khớp.');expect(reset).toBe(false);
    await page.getByLabel('Xác nhận mật khẩu mới', {exact: true}).fill('New-password!123');
    await page.getByRole('button', {name: 'Đặt lại mật khẩu', exact: true}).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Đã đặt lại mật khẩu.');expect(reset).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}

import { test } from '@playwright/test';

const scenario = async (page, baseURL, outputPath) => {
  const results = [];
  for (const role of ['CUSTOMER', 'ADMIN']) {
    for (const width of [1440, 390]) {
      const context = await page.context().browser().newContext();
      const current = await context.newPage();
      const errors = [];
      const failed = [];
      let submissions = 0;
      let decisions = 0;
      let uploaded = 0;
      let submitted = false;
      let dossier = {
        id: '9', propertyId: '1', propertyName: 'Tài sản kiểm thử', propertyAddress: '12 Đường số 8',
        applicantName: 'Nguyễn Văn Chương', rightType: 'AUTHORIZATION', status: 'PENDING_APPROVAL',
        bank: role === 'ADMIN' ? 'Historical bank' : null, accountNumber: role === 'ADMIN' ? '12345678' : null,
        accountHolderName: role === 'ADMIN' ? 'Historical holder' : null,
        rightsValidFrom: '2026-01-01', rightsValidUntil: '2028-12-31',
        principalName: 'Lê Minh Khoa', principalDocumentNumber: '999000000101',
        files: [], submittedAt: '2026-11-09T00:00:00Z', reviewedAt: null, reviewReason: null, version: 0,
      };
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      try {
        current.on('pageerror', error => errors.push(error.message));
        current.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        current.on('requestfailed', request => {
          if (request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(request.url());
        });
        await current.route('https://accounts.google.com/**', route => route.fulfill({
          contentType: 'application/javascript',
          body: 'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){},cancel(){}}}}',
        }));
        await current.route('**/api/**', async route => {
          const request = route.request();
          const path = new URL(request.url()).pathname;
          const json = body => route.fulfill({ json: body });
          const user = { id: '1', fullName: 'Nguyễn Văn Chương', email: 'dossier@example.invalid', roles: [role],
            accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 };
          if (path.endsWith('/auth/refresh')) return json({ accessToken: 'fixture', expiresIn: 900, user });
          if (path.endsWith('/auth/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
          if (path.endsWith('/auth/vneid-config')) return json({ enabled: false });
          if (path === '/api/v1/me') return json(user);
          if (path.endsWith('/me/verifications')) return json({ emailVerified: true, vneid: { status: 'VERIFIED', identity: null } });
          if (path === '/api/v1/me/rental-properties') return json([{ id: '1', name: dossier.propertyName,
            address: dossier.propertyAddress, city: 'Test', district: 'Test', approvalStatus: submitted ? 'PENDING_APPROVAL' : 'DRAFT',
            rentalMode: 'SINGLE_UNIT', rightType: 'AUTHORIZATION', onboardingApplication: true, version: 0 }]);
          if (path.endsWith('/evidence-files')) {
            const raw = request.postDataBuffer().toString('utf8');
            const purpose = raw.match(/name="purpose"\r\n\r\n([A-Z_]+)/)?.[1];
            const file = { id: String(++uploaded), purpose, filename: purpose + '.png', contentType: 'image/png', size: 10 };
            dossier.files.push(file);
            return route.fulfill({ status: 201, json: file });
          }
          if (path.endsWith('/verification-dossiers')) {
            if (request.method() === 'POST') {
              const body = request.postDataJSON();
              check(!('receivingAccount' in body), 'Submission still carries a receiving account');
              check(body.principalName === 'Lê Minh Khoa' && body.authorizationFileIds.length === 1, 'Rights data missing');
              submitted = true;
              submissions++;
              return route.fulfill({ status: 201, json: dossier });
            }
            return json(submitted ? [dossier] : []);
          }
          if (path.endsWith('/admin/property-dossiers')) return json({ items: [dossier], page: 0, size: 20,
            totalElements: 1, totalPages: 1 });
          if (path.endsWith('/property-dossiers/9')) return json(dossier);
          if (path.endsWith('/ai-review')) return json({ status: 'NOT_REQUESTED', version: 0 });
          if (path.endsWith('/decisions')) {
            check(request.postDataJSON().decision === 'APPROVE', 'Wrong review action');
            decisions++;
            dossier = { ...dossier, status: 'APPROVED', version: 1 };
            return json(dossier);
          }
          if (path.includes('notifications')) return json({ items: [], unreadCount: 0 });
          return json([]);
        });
        await current.setViewportSize({ width, height: 1000 });
        await current.goto(new URL(role === 'ADMIN' ? '/admin/property-dossiers' : '/account/rental-properties', baseURL).href);
        let section;
        if (role === 'CUSTOMER') {
          await current.getByRole('button', { name: 'Mở hồ sơ và giấy tờ', exact: true }).click();
          section = current.getByRole('dialog', { name: 'Hồ sơ kiểm duyệt tài sản' });
          await section.getByLabel('Họ tên chủ sở hữu gốc *', { exact: true }).fill('Lê Minh Khoa');
          await section.getByLabel('CCCD chủ sở hữu gốc *', { exact: true }).fill('999000000101');
          await section.getByLabel('Quyền cho thuê từ ngày *', { exact: true }).fill('2026-01-01');
          await section.getByLabel('Quyền cho thuê đến hết ngày *', { exact: true }).fill('2028-12-31');
          for (const label of ['Giấy tờ sở hữu / quyền khai thác *', 'Giấy ủy quyền *']) {
            await section.getByLabel(label, { exact: true }).setInputFiles({
              name: 'evidence.png', mimeType: 'image/png', buffer: Buffer.from('fixture'),
            });
          }
          await section.getByRole('button', { name: 'Gửi hồ sơ kiểm duyệt', exact: true }).click();
          await section.getByText('Chờ duyệt', { exact: false }).first().waitFor();
          check(submissions === 1, 'Dossier was not submitted');
        } else {
          await current.getByTestId('admin-dossier-card').click();
          section = current.getByRole('region', { name: 'Chi tiết hồ sơ kiểm duyệt' });
          await section.getByRole('checkbox').check();
          await section.getByRole('button', { name: 'Phê duyệt tài sản', exact: true }).click();
          await current.getByText('Đã cập nhật hồ sơ: Đã duyệt.', { exact: true }).waitFor();
          check(decisions === 1, 'Review was not completed');
        }
        const text = await section.innerText();
        check(!/Ngân hàng|Số tài khoản|Chủ tài khoản|Historical bank|Historical holder/.test(text), 'Bank remains in dossier UI');
        check(!await current.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Page overflow');
        check(await section.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Section overflow');
        check(!errors.length && !failed.length, JSON.stringify({ errors, failed }));
        await current.screenshot({ path: outputPath(`dossier-no-bank-${role}-${width}.png`), fullPage: true });
        results.push({ role, width, submissions, decisions, errors, failed, overflow: false });
      } finally {
        await context.close();
      }
    }
  }
  return results;
};

test('Applicant submits and Admin reviews property rights without banking fields', async ({ page, baseURL }, info) => {
  test.setTimeout(60000);
  await scenario(page, baseURL, name => info.outputPath(name));
});

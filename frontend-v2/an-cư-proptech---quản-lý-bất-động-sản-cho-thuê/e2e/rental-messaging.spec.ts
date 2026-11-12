import { expect, test, type Page } from '@playwright/test';

test('Khách thuê và chủ nhà nhắn tin hai chiều trên máy tính và điện thoại', async ({ browser, baseURL }) => {
  const customerContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const sent: { id: string; body: string; key: string; author: string; sentAt: string }[] = [];
  let simulatedDisconnect = true;
  const conversationId = '9007199254740993';

  async function fixture(page: Page, role: 'OWNER' | 'CUSTOMER') {
    const user = {
      id: role === 'OWNER' ? '11' : '12', roles: [role], fullName: role === 'OWNER' ? 'Chủ nhà thử' : 'Khách thuê thử',
      email: 'test@example.invalid', accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED',
    };
    await page.route('**/api/**', async route => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      const json = (body: unknown) => route.fulfill({ json: body });
      if (pathname.endsWith('/auth/csrf')) return json({ headerName: 'X-XSRF-TOKEN', token: 'test' });
      if (pathname.endsWith('/auth/refresh')) return json({ accessToken: 'fixture', tokenType: 'Bearer', expiresIn: 900, user });
      if (pathname.endsWith('/me/notifications')) return json({ items: [], totalElements: 0, totalPages: 0, unreadCount: 0 });

      const conversation = {
        id: conversationId, apartmentId: '42', apartmentTitle: 'Phòng 101',
        otherName: role === 'OWNER' ? 'Khách thuê thử' : 'Chủ nhà thử',
        lastMessageAt: sent.at(-1)?.sentAt ?? null,
      };
      const view = (message: typeof sent[number]) => ({
        id: message.id, body: message.body, sentAt: message.sentAt, mine: message.author === role,
      });
      if (pathname.endsWith('/me/conversations')) {
        return json({ items: sent.length ? [conversation] : [], page: 0, size: 20, totalPages: 1, totalElements: sent.length ? 1 : 0 });
      }
      if (pathname.endsWith(`/conversations/${conversationId}/messages`)) {
        if (request.method() === 'POST') {
          const input = request.postDataJSON();
          let message = sent.find(item => item.key === input.requestKey && item.author === role);
          if (!message) {
            message = { id: String(sent.length + 1), body: input.body, key: input.requestKey, author: role, sentAt: new Date().toISOString() };
            sent.push(message);
          }
          if (simulatedDisconnect) {
            simulatedDisconnect = false;
            return route.fulfill({ status: 503, json: { message: 'Chưa nhận được phản hồi gửi tin.' } });
          }
          return json(view(message));
        }
        const after = searchParams.get('after');
        return json({ conversation, messages: sent.filter(message => !after || BigInt(message.id) > BigInt(after)).map(view), hasMore: false });
      }
      return json([]);
    });
  }

  try {
    const customer = await customerContext.newPage();
    const owner = await ownerContext.newPage();
    await fixture(customer, 'CUSTOMER');
    await fixture(owner, 'OWNER');
    await customer.goto(`/my/messages/${conversationId}`);
    const input = customer.getByRole('textbox', { name: 'Nội dung tin nhắn' });
    await input.fill('Cho mình hẹn xem phòng ạ');
    await customer.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(customer.getByRole('alert')).toHaveText('Chưa nhận được phản hồi gửi tin.');
    await expect(input).toHaveValue('Cho mình hẹn xem phòng ạ');
    await customer.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(customer.getByRole('log')).toContainText('Cho mình hẹn xem phòng ạ');
    expect(sent).toHaveLength(1);

    await owner.goto('/my/messages');
    await owner.getByRole('link', { name: /Khách thuê thử.*Phòng 101/ }).click();
    await expect(owner.getByRole('log')).toContainText('Cho mình hẹn xem phòng ạ');
    await owner.getByRole('textbox', { name: 'Nội dung tin nhắn' }).fill('Chiều nay bạn qua xem được nhé');
    await owner.getByRole('button', { name: 'Gửi', exact: true }).click();
    await customer.bringToFront();
    await expect(customer.getByRole('log')).toContainText('Chiều nay bạn qua xem được nhé', { timeout: 12000 });
    expect(await customer.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await customer.reload();
    await expect(customer.getByRole('log')).toContainText('Chiều nay bạn qua xem được nhé');
  } finally {
    await customerContext.close();
    await ownerContext.close();
  }
});

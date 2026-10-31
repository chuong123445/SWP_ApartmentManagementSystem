import type { Page } from '@playwright/test';

// Giả lập SDK bên ngoài để kiểm tra tích hợp UI, không gọi tài khoản Google thật.
export async function mockGoogleIdentity(page: Page) {
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
    contentType: 'application/javascript; charset=utf-8',
    body: `(() => {
      let callback;
      window.google = { accounts: { id: {
        initialize(options) { callback = options.callback; },
        renderButton(element) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Google test sign in';
          button.style.width = '300px';
          button.onclick = () => callback({ credential: 'controlled-google-credential' });
          element.replaceChildren(button);
        }
      } } };
    })();`,
  }));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignaturePad } from '../src/components/contract/SignaturePad';

test('SignaturePad renders both Draw and Type tabs with default draw mode', () => {
  const html = renderToStaticMarkup(
    createElement(SignaturePad, {
      disabled: false,
      onChange: () => {},
      defaultName: 'Nguyễn Văn An',
    })
  );

  assert.match(html, /Vẽ chữ ký/);
  assert.match(html, /Gõ họ tên/);
  assert.match(html, /Dùng chuột hoặc ngón tay ký tại đây/);
  assert.match(html, /Xóa chữ ký/);
});

test('SignaturePad respects disabled prop on controls', () => {
  const html = renderToStaticMarkup(
    createElement(SignaturePad, {
      disabled: true,
      onChange: () => {},
    })
  );

  assert.match(html, /<button[^>]*disabled/);
});

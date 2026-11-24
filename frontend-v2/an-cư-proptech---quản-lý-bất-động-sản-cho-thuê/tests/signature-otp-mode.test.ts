import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SignatureOtpConfirmation} from '../src/components/contract/SignatureOtpConfirmation';
const props={disabled:false,label:'Xác nhận ký hợp đồng',request:async()=>{throw new Error('No network during render');},confirm:async()=>{}};
test('explicit server test flag renders direct signing with a test label',()=>{
 const html=renderToStaticMarkup(createElement(SignatureOtpConfirmation,{...props,otpRequired:false}));
 assert.match(html,/Chế độ kiểm thử: ký không cần OTP/);assert.match(html,/Xác nhận ký hợp đồng/);assert.doesNotMatch(html,/Mã OTP xác nhận chữ ký|Gửi lại mã OTP/);
});
test('missing or true OTP flag keeps normal signing mode',()=>{
 for(const otpRequired of [undefined,true]){const html=renderToStaticMarkup(createElement(SignatureOtpConfirmation,{...props,otpRequired}));assert.doesNotMatch(html,/Chế độ kiểm thử/);assert.match(html,/Xác nhận ký hợp đồng/);}
});
test('test mode does not remove the signature and consent disabled gate',()=>{
 const html=renderToStaticMarkup(createElement(SignatureOtpConfirmation,{...props,otpRequired:false,disabled:true}));assert.match(html,/<button[^>]*disabled/);
});

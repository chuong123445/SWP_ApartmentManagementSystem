import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
async function fixture(page:Page,provider:'AUTH0'|'GOOGLE'|'LOCAL',reject=false){
  const errors:string[]=[],network:string[]=[],logs:string[]=[];let signedOut=false;let writes=0;let nonce='';let confirms=0;let challengePurpose='';
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')logs.push(`${e.text()} [${e.location().url}]`);});page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')network.push(r.url());});
  const user={id:'41',email:'external@example.invalid',fullName:'Nguyễn Minh Khang',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:2};
  const profile={...user,emailVerified:false,phoneVerified:false,emailOtpAvailable:true,phone:null,address:null,bio:null,dateOfBirth:null};
  await page.context().route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(o){window.__googleNonce=o.nonce;window.__googleCallback=o.callback;},renderButton(el){const b=document.createElement('button');b.type='button';b.textContent='Google test sign in';b.onclick=()=>window.__googleCallback({credential:'google-new-credential'});el.replaceChildren(b);}}}};`}));
  await page.context().route('https://auth0-test.invalid/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/authorize'){
      expect(url.searchParams.get('prompt')).toBe('login');expect(url.searchParams.get('max_age')).toBe('0');expect(url.searchParams.get('code_challenge_method')).toBe('S256');nonce=url.searchParams.get('nonce')!;
      const data=JSON.stringify({type:'authorization_response',response:{code:'fresh-code',state:url.searchParams.get('state')}});
      return route.fulfill({contentType:'text/html',body:`<script>window.opener.postMessage(${data},'*');</script>`});
    }
    if(url.pathname==='/oauth/token'){
      const b=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');const now=Math.floor(Date.now()/1000);
      return route.fulfill({json:{access_token:'external-access',id_token:`${b({alg:'RS256',typ:'JWT'})}.${b({iss:'https://auth0-test.invalid/',sub:'auth0|linked',aud:'test-spa',iat:now,auth_time:now,exp:now+3600,nonce})}.test-signature`,token_type:'Bearer',expires_in:3600,scope:'openid profile email'}});
    }return route.fulfill({json:{}});
  });
  await page.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(path==='/api/v1/auth/vneid-config')return route.fulfill({json:provider==='AUTH0'?{enabled:true,issuer:'https://auth0-test.invalid/',clientId:'test-spa',audience:'test-api',connection:'test-db'}:{enabled:false}});
    if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'csrf',headerName:'X-XSRF-TOKEN'}});
    if(path==='/api/v1/auth/refresh')return signedOut?route.fulfill({status:401,json:{message:'Đã đăng xuất'}}):route.fulfill({json:{accessToken:'internal-only',tokenType:'Bearer',expiresIn:900,user}});
    if(path==='/api/v1/me')return route.fulfill({json:user});
    if(path==='/api/v1/me/profile')return route.fulfill({json:profile});
    if(path==='/api/v1/me/security')return route.fulfill({json:{passwordAvailable:provider==='LOCAL',providers:provider==='LOCAL'?[]:[provider]}});
    if(path==='/api/v1/me/email-change')return route.fulfill({status:204});
    if(path==='/api/v1/me/reauthentications'){
      expect(req.headers().authorization).toBe('Bearer internal-only');challengePurpose=req.postDataJSON().purpose;
      return route.fulfill({json:{id:'55',nonce:'server-random-nonce',expiresAt:new Date(Date.now()+300000).toISOString()}});
    }
    if(path==='/api/v1/me/reauthentications/55/confirm'){
      const body=req.postDataJSON();expect(body.provider).toBe(provider);confirms++;
      if(provider==='AUTH0')expect(JSON.parse(Buffer.from(body.credential.split('.')[1],'base64url').toString()).auth_time).toBeGreaterThan(0);
      if(provider==='GOOGLE'){expect(body.credential).toBe('google-new-credential');expect(await page.evaluate(()=>(window as any).__googleNonce)).toBe('server-random-nonce');}
      return reject?route.fulfill({status:403,json:{code:'REAUTHENTICATION_REQUIRED',message:'Hãy dùng đúng tài khoản đã liên kết.'}}):route.fulfill({json:{proof:'one-time-internal-proof',expiresAt:new Date(Date.now()+300000).toISOString()}});
    }
    if(['/api/v1/me/password','/api/v1/me/phone','/api/v1/me/email-changes'].includes(path)){
      const body=req.postDataJSON();expect(body.version).toBe(2);writes++;
      if(provider==='LOCAL')expect(body.currentPassword).toBe('Current-password!123');else{expect(body.reauthenticationProof).toBe('one-time-internal-proof');expect(body.currentPassword).toBeUndefined();expect(challengePurpose).toBe(path.endsWith('/password')?'PASSWORD':path.endsWith('/phone')?'PHONE':'EMAIL');}
      if(path.endsWith('/email-changes'))return route.fulfill({status:202,json:{id:'77',destinationHint:'ne***@example.invalid',status:'PENDING',expiresAt:new Date(Date.now()+600000).toISOString()}});
      signedOut=true;return path.endsWith('/password')?route.fulfill({status:204}):route.fulfill({json:{...profile,phone:'+84912345678'}});
    }
    if(path==='/api/v1/me/email-changes/77/confirm'){expect(req.postDataJSON()).toEqual({code:'123456'});signedOut=true;return route.fulfill({json:{...profile,email:'new@example.invalid',emailVerified:true}});}
    if(path==='/api/v1/me/tenancies')return route.fulfill({json:[]});
    network.push(`Unexpected API ${path}`);return route.fulfill({status:404});
  });
  return {writes:()=>writes,confirms:()=>confirms,check:()=>{expect(errors).toEqual([]);expect(network).toEqual([]);expect(logs.filter(x=>!(x.includes('status of 404')&&x.includes('/favicon.ico]'))&&!x.includes('status of 401')&&!(reject&&x.includes('status of 403')))).toEqual([]);}};
}
for(const width of [1440,390])test(`Auth0 recent popup reauth allows first local password at ${width}px`,async({page})=>{
  const f=await fixture(page,'AUTH0');await page.setViewportSize({width,height:900});await page.goto('/account/settings/password');
  await expect(page.getByRole('heading',{name:'Thiết lập mật khẩu An Cư'})).toBeVisible();await expect(page.locator('#password-current')).toHaveCount(0);await expect(page.getByRole('button',{name:'Thiết lập mật khẩu An Cư',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Xác thực lại bằng VNeID mô phỏng'}).click();await expect(page.getByRole('status')).toContainText('Đã xác thực lại.');
  await page.locator('#password-new').fill('New-password!12345');await page.locator('#password-confirm').fill('New-password!12345');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync('test-results/visual',{recursive:true});await page.screenshot({path:`test-results/visual/external-password-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Thiết lập mật khẩu An Cư',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(f.writes()).toBe(1);expect(f.confirms()).toBe(1);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toMatch(/one-time-internal-proof|internal-only|test-signature/);f.check();
});
test('Wrong Auth0 account stays blocked and offers retry',async({page})=>{
  const f=await fixture(page,'AUTH0',true);await page.goto('/account/settings/phone');await page.getByRole('button',{name:'Xác thực lại bằng VNeID mô phỏng'}).click();await expect(page.getByRole('alert')).toContainText('đúng tài khoản');await expect(page.getByRole('button',{name:'Cập nhật số điện thoại',exact:true})).toBeDisabled();expect(f.writes()).toBe(0);f.check();
});
test('Google nonce reauth allows phone change without inventing local password',async({page})=>{
  const f=await fixture(page,'GOOGLE');await page.goto('/account/settings/phone');await expect(page.locator('#phone-password')).toHaveCount(0);await page.getByRole('button',{name:'Xác thực lại bằng Google',exact:true}).click();await page.getByRole('button',{name:'Google test sign in'}).click();await expect(page.getByRole('status')).toContainText('Đã xác thực lại.');await page.locator('#phone-number').fill('0912345678');await page.getByRole('button',{name:'Cập nhật số điện thoại',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(f.writes()).toBe(1);f.check();
});
test('External email change keeps OTP confirmation after provider reauth',async({page})=>{
  const f=await fixture(page,'AUTH0');await page.goto('/account/settings/email');await page.getByRole('button',{name:'Xác thực lại bằng VNeID mô phỏng'}).click();await expect(page.getByRole('status')).toContainText('Đã xác thực lại.');await page.locator('#email-new').fill('new@example.invalid');await page.getByRole('button',{name:'Gửi OTP email',exact:true}).click();await expect(page.locator('#email-otp')).toBeVisible();await expect(page).toHaveURL(/\/account\/settings\/email$/);await page.locator('#email-otp').fill('123456');await page.getByRole('button',{name:'Xác nhận email',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(f.writes()).toBe(1);f.check();
});
test('Local password account retains current-password command',async({page})=>{
  const f=await fixture(page,'LOCAL');await page.goto('/account/settings/password');await page.locator('#password-current').fill('Current-password!123');await page.locator('#password-new').fill('New-password!12345');await page.locator('#password-confirm').fill('New-password!12345');await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(f.confirms()).toBe(0);expect(f.writes()).toBe(1);f.check();
});

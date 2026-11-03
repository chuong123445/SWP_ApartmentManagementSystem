import { test } from '@playwright/test';

for(const width of [1440,390])test(`Google registration also requires Vietnamese phone at ${width}px`,async({page})=>{
  const errors:string[]=[],unexpected:string[]=[];let calls=0;
  page.on('pageerror',e=>errors.push(e.message));
  const user={id:'80',fullName:'Google fixture',email:'google@example.invalid',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  await page.route('https://accounts.google.com/**',route=>route.fulfill({contentType:'application/javascript',body:"let settings;window.google={accounts:{id:{initialize(options){settings=options;},renderButton(container){let b=document.createElement('button');b.textContent='Google fixture login';b.onclick=()=>settings.callback({credential:'google-test-only'});container.replaceChildren(b);},cancel(){},disableAutoSelect(){}}}};"}));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname,json=(body:unknown,status=200)=>route.fulfill({status,json:body});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/refresh'))return json({message:'No session'},401);
    if(path.endsWith('/google')){calls++;const body=route.request().postDataJSON();if(body.credential!=='google-test-only')throw Error('Wrong credential');if(calls===1)return json({code:'GOOGLE_PHONE_REQUIRED',message:'Phone required'},428);if(body.phone!=='0912345678')throw Error('Wrong phone');return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});}
    if(path.endsWith('/me'))return json(user);
    if(path.includes('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.includes('apartments/address-options')||path.includes('/me/tenancies')||path.endsWith('/me/payments/sepay/test-payments'))return json([]);
    if(path.includes('/apartments')||path.endsWith('/me/invoices'))return json({items:[],page:0,totalPages:0,totalElements:0});
    unexpected.push(path);return json({},404);
  });
  await page.setViewportSize({width,height:950});await page.goto('/login');await page.getByRole('button',{name:'Google fixture login',exact:true}).click();
  await page.getByRole('heading',{name:'Bổ sung số điện thoại',exact:true}).waitFor();
  await page.getByLabel('Số điện thoại liên hệ',{exact:true}).fill('+12025550123');await page.getByRole('button',{name:'Hoàn tất đăng ký bằng Google',exact:true}).click();
  await page.getByRole('alert').waitFor();if(calls!==1)throw Error('Invalid phone reached API');
  await page.getByLabel('Số điện thoại liên hệ',{exact:true}).fill('0912345678');await page.getByRole('button',{name:'Hoàn tất đăng ký bằng Google',exact:true}).click();
  await page.getByRole('button',{name:'Vai trò và tài khoản',exact:true}).waitFor();if(Number(calls)!==2)throw Error('Duplicate Google submission');
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)||errors.length||unexpected.length)throw Error(JSON.stringify({errors,unexpected}));
});

for(const width of [1440,390])test(`Registration requires a Vietnamese phone at ${width}px`,async({page})=>{
  const errors:string[]=[],unexpected:string[]=[];let registrations=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/vneid-config'))return route.fulfill({json:{enabled:false}});
    if(path.endsWith('/csrf'))return route.fulfill({json:{token:'fixture',headerName:'X-XSRF-TOKEN'}});
    if(path.endsWith('/refresh'))return route.fulfill({status:401,json:{message:'No session'}});
    if(path.endsWith('/register')){registrations++;const body=route.request().postDataJSON();if(body.phone!=='0912 345 678')throw Error('Wrong registration contact');return route.fulfill({status:409,json:{message:'Email đã được sử dụng.'}});}
    unexpected.push(path);return route.fulfill({status:404});
  });
  await page.setViewportSize({width,height:950});await page.goto('/register');
  await page.locator('#register-name').fill('Người kiểm thử');await page.locator('#register-email').fill('registration@example.invalid');
  await page.locator('#register-password').fill('Registration-test-only!123');await page.locator('#register-confirm').fill('Registration-test-only!123');
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();if(registrations!==0)throw Error('Missing phone reached API');
  await page.locator('#register-phone').fill('+12025550123');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Số điện thoại'}).waitFor();if(registrations!==0)throw Error('Foreign phone reached API');
  await page.locator('#register-phone').fill('0912 345 678');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await page.getByText('Email đã được sử dụng.',{exact:true}).waitFor();if(Number(registrations)!==1)throw Error('Expected one valid registration request');
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Overflow');if(errors.length||unexpected.length)throw Error(JSON.stringify({errors,unexpected}));
});

for(const width of [1440,390])for(const scenario of ['success','conflict','returning','expired'])test(`Auth0 contact onboarding ${scenario} at ${width}px`,async({page})=>{
  await page.context().clearCookies();const errors:string[]=[],unexpected:string[]=[],logs:string[]=[];let calls=0,nonce='',access='';
  const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')unexpected.push(r.url());});
  page.on('console',m=>{if(m.type()==='error'&&!/status of (401|428|409)/.test(m.text())&&!m.location().url.endsWith('/favicon.ico'))logs.push(m.text());});
  const config={enabled:true,issuer:'https://contact-auth0.invalid/',clientId:'contact-spa',audience:'contact-api',connection:'contact-db'};
  function enc(value:unknown){const s=JSON.stringify(value),abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let result='',bits=0,n=0;for(let i=0;i<s.length;i++){n=(n<<8)|s.charCodeAt(i);bits+=8;while(bits>=6){bits-=6;result+=abc[(n>>bits)&63];}}if(bits)result+=abc[(n<<(6-bits))&63];return result;}
  const user={id:'25',email:'contact@example.invalid',fullName:'Người kiểm thử',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname,json=(body:unknown,status=200)=>route.fulfill({status,json:body});
    if(path.endsWith('/vneid-config'))return json(config);
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/refresh'))return json({message:'No session'},401);
    if(path.endsWith('/vneid-login')){
      calls++;check(route.request().headers().authorization==='Bearer '+access,'Wrong bearer transport');
      if(calls===1&&scenario!=='returning')return json({code:'VNEID_CONTACT_REQUIRED',message:'Bổ sung liên hệ'},428);
      if(scenario!=='returning'){const contact=route.request().postDataJSON();check(contact.email==='contact@example.invalid'&&contact.phone==='0387654321','Wrong contact payload');}
      if(scenario==='conflict')return json({code:'VNEID_EMAIL_CHANGE_REQUIRED',message:'Email phải trùng email hiện tại của tài khoản.'},409);
      if(scenario==='expired')return json({code:'VNEID_TOKEN_INVALID',message:'Phiên Auth0 đã hết hạn. Hãy đăng nhập lại.'},401);
      return json({accessToken:'internal-fixture',tokenType:'Bearer',expiresIn:900,user});
    }
    if(path.endsWith('/me'))return json(user);
    if(path.includes('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.includes('apartments/address-options')||path.includes('/me/tenancies'))return json([]);
    if(path.includes('/apartments'))return json({items:[],page:0,size:6,totalPages:0,totalElements:0});
    if(path.endsWith('/me/payments/sepay/test-payments'))return json([]);
    if(path.endsWith('/me/invoices'))return json({items:[],page:0,totalPages:0,totalElements:0});
    unexpected.push(path);return json({},404);
  });
  await page.route('https://accounts.google.com/**',route=>route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},cancel(){},disableAutoSelect(){}}}};'}));
  await page.route('https://contact-auth0.invalid/**',route=>{
    const u=new URL(route.request().url());if(u.pathname==='/authorize'){nonce=u.searchParams.get('nonce')!;return route.fulfill({status:302,headers:{location:`${u.searchParams.get('redirect_uri')}?code=contact-code&state=${encodeURIComponent(u.searchParams.get('state')!)}`}});}
    if(u.pathname==='/oauth/token'){const now=Math.floor(Date.now()/1000);access=enc({alg:'RS256'})+'.'+enc({sub:'PRIVATE_SUBJECT',exp:now+3600})+'.fixture';const id=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:config.issuer,sub:'PRIVATE_SUBJECT',aud:config.clientId,iat:now,exp:now+3600,nonce})+'.fixture';return route.fulfill({json:{access_token:access,id_token:id,token_type:'Bearer',expires_in:3600,scope:'openid profile email'}});}
    unexpected.push(u.pathname);return route.fulfill({status:400});
  });
  await page.setViewportSize({width,height:950});await page.goto('/login');await page.getByRole('button',{name:'Đăng nhập bằng VNeID mô phỏng',exact:true}).click();
  if(scenario!=='returning'){
    await page.getByRole('heading',{name:'Bổ sung thông tin liên hệ',exact:true}).waitFor();check(calls===1,'Duplicate initial submission');
    await page.getByLabel('Email liên hệ',{exact:true}).fill('contact@example.invalid');await page.getByLabel('Số điện thoại',{exact:true}).fill('+12025550123');
    await page.getByRole('button',{name:'Lưu và hoàn tất đăng nhập',exact:true}).click();await page.getByRole('alert').waitFor();check(calls===1,'Invalid phone sent');
    await page.getByLabel('Số điện thoại',{exact:true}).fill('0387654321');await page.getByRole('button',{name:'Lưu và hoàn tất đăng nhập',exact:true}).click();
    if(scenario==='conflict'||scenario==='expired')await page.getByRole('alert').filter({hasText:scenario==='conflict'?'Email phải trùng':'hết hạn'}).waitFor();
  }
  if(scenario==='success'||scenario==='returning')await page.getByRole('button',{name:'Vai trò và tài khoản',exact:true}).waitFor();
  check(calls===(scenario==='returning'?1:2),'Duplicate completion');
  check(!await page.locator('body').textContent().then(t=>t?.includes(access)||t?.includes('PRIVATE_SUBJECT')),'Token exposed');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow');check(!errors.length&&!unexpected.length&&!logs.length,JSON.stringify({errors,unexpected,logs}));
});

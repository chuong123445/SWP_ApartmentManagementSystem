import { test, type Page } from '@playwright/test';

// Real SPA + Auth0 SDK callback with intercepted provider/API responses.
// This checks browser behavior, not a live Auth0 identity or database binding.
export async function checkVneidNameFlow(page: Page, width: number, action: 'confirm' | 'cancel' | 'expired') {
  const errors: string[] = [], failed: string[] = [], consoleErrors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(r.url()); });
  page.on('console', m => { if(m.type()==='error' && !(action==='expired' && m.text().includes('status of 409')) && !m.location().url.endsWith('/favicon.ico')) consoleErrors.push(m.text()); });
  let linked=false, confirms=0, cancels=0, prepares=0, explicitLogins=0, nonce='', displayName='Tên hiển thị kiểm thử';
  const legalName='Nguyễn Văn Kiểm Thử';
  const user=()=>({id:'1',email:'name-test@example.invalid',fullName:displayName,roles:['CUSTOMER'],accountStatus:linked?'ACTIVE':'PENDING_VERIFICATION',contactVerificationStatus:linked?'VERIFIED':'UNVERIFIED',version:1});
  const session=()=>({accessToken:'internal-name-fixture',tokenType:'Bearer',expiresIn:900,user:user()});
  function check(ok: unknown, message: string) { if(!ok)throw new Error(message); }
  await page.route('**/api/**', async route=>{
    const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
    const json=(value: unknown,status=200)=>route.fulfill({status,json:value});
    if(path.endsWith('/auth/vneid-config'))return json({enabled:true,issuer:'https://name-auth0.invalid/',clientId:'name-spa',audience:'name-api',connection:'test'});
    if(path.endsWith('/auth/csrf'))return json({token:'name-csrf',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/auth/refresh'))return json(session());
    if(path==='/api/v1/me')return json(user());
    if(path==='/api/v1/me/profile'){
      if(method==='PUT')displayName=route.request().postDataJSON().fullName;
      return json({...user(),dateOfBirth:null,address:null,bio:null,phone:null,emailVerified:false,phoneVerified:false});
    }
    if(path==='/api/v1/me/verifications')return json({emailVerified:false,vneid:linked?{status:'VERIFIED',verifiedAt:'2026-11-02T00:00:00Z',identity:{legalName,documentNumber:'000000000001',dateOfBirth:'1990-01-01',gender:'Nam',address:'Địa chỉ kiểm thử'}}:{status:'UNVERIFIED',verifiedAt:null,identity:null}});
    if(path.startsWith('/api/v1/me/verifications/vneid')){
      const headers=route.request().headers();
      check(headers.authorization==='Bearer internal-name-fixture','Wrong internal session');
      check(headers['x-xsrf-token']==='name-csrf','Missing CSRF');
      const body=route.request().postDataJSON();
      if(path.endsWith('/confirm')){
        confirms++;check(JSON.stringify(body)===JSON.stringify({confirmationId:'opaque-name-fixture'}),'Confirmation accepts only opaque ID');
        if(action==='expired')return json({code:'VNEID_CONFIRMATION_INVALID',message:'Xác nhận đã hết hạn. Hãy bắt đầu xác thực lại.'},409);
        linked=true;return json(user());
      }
      if(path.endsWith('/cancel')){cancels++;check(!linked,'Cancel must not bind');return route.fulfill({status:204});}
      prepares++;check(body.auth0AccessToken==='external-name-fixture','Missing external evidence');
      return json({status:'CONFIRMATION_REQUIRED',confirmationId:'opaque-name-fixture',displayName,legalName,expiresAt:new Date(Date.now()+300000).toISOString()},202);
    }
    if(path.includes('apartments'))return json({items:[],page:0,size:6,totalPages:0,totalElements:0});
    return json([]);
  });
  await page.route('https://accounts.google.com/**',route=>route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},cancel(){},disableAutoSelect(){}}}};'}));
  await page.route('https://name-auth0.invalid/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/authorize'){
      nonce=url.searchParams.get('nonce')!;
      if(url.searchParams.get('prompt')==='login')explicitLogins++;
      else check(url.searchParams.get('prompt')==='none','Unexpected provider authorization prompt');
      return route.fulfill({status:302,headers:{location:`${url.searchParams.get('redirect_uri')}?code=name-code&state=${encodeURIComponent(url.searchParams.get('state')!)}`}});
    }
    if(url.pathname==='/oauth/token'){
      const enc=(value: unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
      const id=`${enc({alg:'RS256',typ:'JWT'})}.${enc({iss:'https://name-auth0.invalid/',sub:'auth0|name',aud:'name-spa',iat:now,exp:now+3600,nonce})}.fixture`;
      return route.fulfill({json:{access_token:'external-name-fixture',id_token:id,token_type:'Bearer',expires_in:3600,scope:'openid profile email'}});
    }
    return route.fulfill({json:{}});
  });
  await page.setViewportSize({width,height:900});
  await page.goto('/account/verification');
  await page.getByRole('button',{name:'Xác thực bằng VNeID mô phỏng'}).click();
  await page.getByRole('heading',{name:'Họ tên khác với tên hiển thị'}).waitFor();
  check(explicitLogins>=1,'Explicit provider login required');
  check(prepares===1 && confirms===0 && !linked,'Preview must not auto-confirm');
  await page.getByText(displayName,{exact:true}).waitFor();await page.getByText(legalName,{exact:true}).waitFor();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Horizontal overflow');
  check(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('opaque-name-fixture'),'Confirmation persisted in browser storage');
  await page.screenshot({path:`test-results/visual/vneid-name-${action}-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:action==='cancel'?'Hủy liên kết':'Xác nhận liên kết',exact:true}).click();
  if(action==='expired'){
    await page.getByRole('alert').filter({hasText:'Xác nhận đã hết hạn'}).waitFor();
    check(confirms===1 && !linked,'Expired confirmation must not link');
    check(await page.getByRole('button',{name:'Xác nhận liên kết',exact:true}).count()===0,'Do not reuse expired preview');
  } else {
    await page.waitForURL('**/account/verification');
    check(action==='confirm'?linked && confirms===1 && cancels===0:!linked && cancels===1 && confirms===0,'Wrong decision behavior');
    if(action==='confirm'){
      await page.goto('/account/profile');
      await page.getByRole('heading',{name:'Họ tên theo VNeID mô phỏng'}).waitFor();
      check(await page.getByLabel('Tên hiển thị',{exact:true}).inputValue()===displayName,'Display name overwritten');
      await page.getByText(legalName,{exact:true}).waitFor();
      check(await page.getByRole('textbox').evaluateAll(fields=>fields.every(field=>(field as HTMLInputElement).value!=='Nguyễn Văn Kiểm Thử')),'Legal identity must not be an editable input');
      await page.getByLabel('Tên hiển thị',{exact:true}).fill('Biệt danh mới');
      await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Đã lưu hồ sơ cá nhân.'}).waitFor();
      await page.getByText(legalName,{exact:true}).waitFor();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Profile horizontal overflow');
    }
  }
  check(errors.length===0,JSON.stringify(errors));check(failed.length===0,JSON.stringify(failed));check(consoleErrors.length===0,JSON.stringify(consoleErrors));
  return {width,action,prepares,confirms,cancels,linked,errors,failed,consoleErrors};
}

for(const width of [1440,390])for(const action of ['confirm','cancel','expired'] as const){
  test(`VNeID name mismatch ${action} at ${width}`,async({page})=>{await checkVneidNameFlow(page,width,action);});
}

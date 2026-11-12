import { ownerSummaryFixture } from './fixtures/ownerSummary';
import { test, type Page } from '@playwright/test';

export async function checkAccountWorkspaces(page: Page, width: number, scenario: string) {
  const errors: string[] = [], network: string[] = [], unexpected: string[] = [], writes: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  page.on('response', r => { if(r.url().includes('/api/')&&r.status()>=400)network.push(r.status()+' '+new URL(r.url()).pathname); });
  let roles = scenario==='customer'||scenario==='pending' ? ['CUSTOMER'] : scenario==='admin' ? ['ADMIN'] : scenario==='reverse' ? ['CUSTOMER','OWNER'] : ['OWNER','CUSTOMER'];
  const user = () => ({id:'2',email:'dual@example.invalid',fullName:'Người dùng hai vai trò',roles,accountStatus:scenario==='pending'?'PENDING_VERIFICATION':'ACTIVE',contactVerificationStatus:scenario==='pending'?'UNVERIFIED':'VERIFIED',version:0});
  const empty = {items:[],content:[],page:0,size:20,totalElements:0,totalPages:0};
  const party = {id:'3',fullName:'Bên cho thuê khác',email:'landlord@example.invalid',phone:'0900000000',address:'Đà Nẵng'};
  // Valid empty PDF fixture; this test checks party/navigation, not PDF content.
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(const [index,object] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>'].entries()){
    offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;
  }
  const xref=pdf.length;pdf+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const draft = {id:'42',rentalRequestId:'31',contractNumber:'HD-42',status:'ACTIVE',version:0,startDate:'2026-11-01',endDate:'2027-11-01',monthlyRent:'2600000',electricityUnitPrice:'3500',waterUnitPrice:'15000',deposit:'2600000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[],createdAt:'2026-11-01T00:00:00Z',snapshot:{owner:party,customer:{...party,id:'2',fullName:'Người dùng hai vai trò'},asset:{apartmentId:'5',propertyId:'4',propertyName:'Tài sản bên cho thuê',title:'Căn hộ kiểm thử',roomNumber:'A.101',address:'Đà Nẵng',amenities:[],areaM2:'35'},receivingAccount:null},signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:'SIGNED',ownerSignedAt:'2026-11-01T00:00:00Z',customerSignedAt:'2026-11-01T01:00:00Z'},lifecycle:{version:0,expired:false,handoverAvailable:false}};
  await page.route('**/*',route=>route.request().resourceType()==='image'||new URL(route.request().url()).pathname==='/favicon.ico'
    ? route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#e2e8f0"/></svg>'}) : route.continue());
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,json=(body:unknown)=>route.fulfill({json:body});
    if(!['GET','HEAD'].includes(request.method())&&!path.endsWith('/refresh'))writes.push(request.method()+' '+path);
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user:user()});
    if(path==='/api/v1/me')return json(user());
    if(path==='/api/v1/me/profile')return json({...user(),phone:null,dateOfBirth:null,address:null,bio:null,emailVerified:scenario!=='pending',phoneVerified:false});
    if(path==='/api/v1/me/verifications')return json({emailVerified:scenario!=='pending',phoneVerified:false,vneid:{status:'NOT_VERIFIED'}});
    if(path.endsWith('/notifications'))return json({...empty,unreadCount:0});
    if(path==='/api/v1/me/tenancies')return json(scenario==='tenant'?[{id:'42',apartmentId:'5',roomNumber:'A.101',apartmentTitle:'Căn hộ kiểm thử',propertyName:'Tài sản bên cho thuê',customerId:'2',customerName:user().fullName,status:'ACTIVE',startDate:draft.startDate,endDate:draft.endDate,monthlyRent:draft.monthlyRent,version:0}]:[]);
    if(path==='/api/v1/contracts/42')return json(draft);
    if(path==='/api/v1/contracts/42/pdf')return route.fulfill({contentType:'application/pdf',body:pdf});
    if(path==='/api/v1/apartments'||path==='/api/v1/apartments/property-groups'||path==='/api/v1/admin/property-dossiers'||path.endsWith('/invoices')||path.endsWith('/rental-requests')||path.endsWith('/renewal-requests'))return json(empty);
    const summary=ownerSummaryFixture(route);if(summary)return summary;
    if(path==='/api/v1/apartments/address-options'||path.endsWith('/address-options'))return json([]);
    if(['/api/v1/owner/properties','/api/v1/owner/apartments','/api/v1/owner/tenancies','/api/v1/owner/maintenance-tickets','/api/v1/me/contract-drafts','/api/v1/owner/contract-drafts','/api/v1/me/payments/sepay/test-payments','/api/v1/admin/property-dossiers'].includes(path))return json([]);
    unexpected.push(request.method()+' '+path);return route.fulfill({status:404,json:{message:'Unexpected fixture route'}});
  });
  const ensure=(condition:boolean,message:string)=>{if(!condition)throw Error(message);};
  const until=async(predicate:()=>Promise<boolean>,message:string)=>{const deadline=Date.now()+8000;while(!(await predicate())){if(Date.now()>deadline)throw Error(message);await page.waitForTimeout(80);}};
  const menu=()=>page.getByRole('navigation',{name:'Điều hướng tài khoản'});
  const assertIdentity=async()=>{
    const info=menu().getByRole('group',{name:'Thông tin tài khoản'});
    const name=info.getByText(user().fullName,{exact:true});
    const label=scenario==='pending'?'Chưa xác thực tài khoản':'Đã xác thực tài khoản';
    await name.waitFor({state:'visible'});await info.getByText(label,{exact:true}).waitFor({state:'visible'});
    ensure(!/\((Owner|Customer|Tenant|Admin)\)/.test(await info.innerText()),'Role labels remain in account identity');
    if(width>=640){
      const trigger=page.getByRole('button',{name:'Tài khoản',exact:true});
      await trigger.getByText(user().fullName,{exact:true}).waitFor({state:'visible'});
      await trigger.getByText(label,{exact:true}).waitFor({state:'visible'});
    }
  };
  const open=async()=>{await page.getByRole('button',{name:'Tài khoản'}).click();await menu().waitFor({state:'visible'});await assertIdentity();};
  await page.setViewportSize({width,height:950});await page.goto('/');await page.getByRole('button',{name:'Tài khoản'}).waitFor({state:'visible'});await open();
  const logo=page.getByRole('link',{name:'An Cư PropTech',exact:true}).locator('img');
  await logo.waitFor({state:'visible'});
  ensure(await logo.evaluate(image=>image instanceof HTMLImageElement && image.complete && image.naturalWidth>0),'Brand image did not load');
  const spaces=menu().getByLabel('Không gian làm việc');
  ensure(await spaces.getByRole('link').count()===(scenario==='customer'||scenario==='pending'||scenario==='admin'?1:2),'Wrong workspace membership');
  ensure(await spaces.getByRole('link',{name:'Quản lý cho thuê',exact:true}).count()===(roles.includes('OWNER')?1:0),'Owner workspace mismatch');
  ensure(await spaces.getByRole('link',{name:'Tìm thuê căn hộ',exact:true}).count()===(roles.includes('CUSTOMER')?1:0),'Customer workspace mismatch');
  if(scenario==='admin'){
    await spaces.getByRole('link',{name:'Quản trị hệ thống',exact:true}).click();await until(async()=>new URL(page.url()).pathname==='/admin/property-dossiers','Admin destination');
    await open();await page.keyboard.press('Escape');
  }else if(scenario==='pending'){
    await page.goto('/account/profile');await page.getByRole('heading',{name:'Hồ sơ cá nhân',exact:true}).waitFor({state:'visible'});
    await open();await page.keyboard.press('Escape');
  }else if(scenario==='customer'){
    await page.goto('/app');await until(async()=>new URL(page.url()).pathname==='/','Customer entered Owner workspace');
  }else if(scenario==='tenant'){
    await page.goto('/contracts/42');await page.getByRole('heading',{name:'Chi tiết hợp đồng',exact:true}).waitFor({state:'visible'});
    await until(async()=>await page.getByRole('link',{name:'← Hợp đồng của tôi',exact:true}).count()===1,'Dual-role tenant was mistaken for this contract owner');
    ensure(await page.getByRole('link',{name:'← Về quản lý',exact:true}).count()===0,'Wrong contract-party navigation');
    await open();await page.keyboard.press('Escape');
  }else{
    await spaces.getByRole('link',{name:'Quản lý cho thuê',exact:true}).click();await until(async()=>new URL(page.url()).pathname==='/app','Owner destination');
    await open();await menu().getByRole('link',{name:'Tìm thuê căn hộ',exact:true}).click();await until(async()=>new URL(page.url()).pathname==='/','Rental destination');
    if(scenario==='revoked'){
      roles=['CUSTOMER'];await page.goto('/app');await until(async()=>new URL(page.url()).pathname==='/','Revoked Owner retained workspace');
      await open();ensure(await menu().getByRole('link',{name:'Quản lý cho thuê',exact:true}).count()===0,'Revoked Owner link remains');
    }
  }
  if(scenario==='dual'||scenario==='reverse'){
    await page.goto('/account/settings');
    await page.getByRole('link',{name:'Số dư và rút tiền',exact:true}).waitFor({state:'visible'});
    ensure(await page.getByRole('link',{name:'Thiết lập thanh toán SePay',exact:true}).count()===0,'Owner still configures a separate SePay account');
    ensure(await page.getByRole('heading',{name:'Cho thuê căn hộ',exact:true}).count()===0,'Owner sees Customer-only acquisition prompt');
    await open();await page.keyboard.press('Escape');
  }
  ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
  ensure(unexpected.length===0,'Unexpected API: '+unexpected.join(';'));ensure(network.length===0,'Network errors: '+network.join(';'));ensure(errors.length===0,'Browser errors: '+errors.join(';'));ensure(writes.length===0,'Workspace navigation changed server state: '+writes.join(';'));
  return {width,scenario,errors,network,unexpected,writes};
}

for(const width of [1440,768,390])for(const scenario of ['dual','reverse','tenant','customer','admin','revoked','pending'])test(`Account identity and workspaces ${scenario} ${width}`,async({page})=>{await checkAccountWorkspaces(page,width,scenario);});

import {test} from '@playwright/test';
export async function exercise(page,width,keep){
 let removed=false,writes=0;const errors=[],bad=[];
 await page.setViewportSize({width,height:1000});page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const current=()=>({id:'31',fullName:'Người kiểm thử',email:'fixture@example.invalid',roles:removed&&!keep?['CUSTOMER']:['OWNER','CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:removed?1:0});
 const group=(id,status)=>({property:{id,name:id==='1'?'Nháp kiểm thử':'Tài sản đã duyệt',address:'Địa chỉ kiểm thử',approvalStatus:status,rentalMode:'MULTI_UNIT',version:0},apartments:[]});
 await page.route('**/api/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,send=x=>route.fulfill({json:x});
  if(p.endsWith('/csrf'))return send({token:'fixture',headerName:'X-XSRF-TOKEN'});
  if(p.endsWith('/vneid-config'))return send({enabled:false});
  if(p.endsWith('/refresh'))return send({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user:current()});
  if(p==='/api/v1/me')return send(current());
  if(p.endsWith('/me/tenancies'))return send([]);
  if(p.endsWith('/me/properties'))return send([...(removed?[]:[group('1','DRAFT')]),...(keep?[group('2','APPROVED')]:[])]);
  if(p.endsWith('/verification-dossiers'))return send([]);
  if(p.endsWith('/rental-properties/1/withdraw')){writes++;removed=true;return route.fulfill({status:204});}
  if(p.includes('notifications')||p.includes('conversations'))return send({items:[],unreadCount:0,totalElements:0,totalPages:0});
  if(p.includes('/apartments/address-options'))return send([]);
  if(p.endsWith('/me/invoices'))return send({items:[],page:0,totalElements:0,totalPages:0});
  if(p.endsWith('/me/payments/sepay/test-payments'))return send([]);
  if(p.includes('/apartments'))return send({items:[],totalElements:0,totalPages:0,page:0,size:6});
  bad.push(p);return send([]);
 });
 await page.goto('http://localhost:3194/account/properties',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Xóa bản nháp',exact:true}).waitFor();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Xóa bản nháp',exact:true}).click();
 await page.getByText('Nháp kiểm thử',{exact:true}).waitFor({state:'hidden'});
 const management=page.getByRole('link',{name:'Trang quản lý',exact:true});
 if(keep){await management.waitFor();await page.getByText('Tài sản đã duyệt',{exact:true}).waitFor();}
 else{
  await page.getByRole('heading',{name:'Bạn chưa có tài sản cho thuê'}).waitFor();
  if(await management.count())throw Error('Stale management link');
  if(width===390)await page.screenshot({path:'F:/2026/Fa26/DTD/tmp/empty-owner-mobile.png',fullPage:true});
  await page.goto('http://localhost:3194/app',{waitUntil:'networkidle'});
  if(new URL(page.url()).pathname==='/app')throw Error('Customer entered workspace');
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 if(writes!==1||errors.length||bad.length||overflow)throw Error(JSON.stringify({writes,errors,bad,overflow}));
 return {width,keepOwner:keep,writes,errors:0,overflow};
}
// Registered scenarios
for(const width of [1440,390])for(const keep of [false,true])test(`Owner role after withdrawal ${width} ${keep}`,async({page})=>{await exercise(page,width,keep);});

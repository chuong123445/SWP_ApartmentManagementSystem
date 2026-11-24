import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ownerSummaryFixture} from './fixtures/ownerSummary';
export async function exercise(page,width,owner){
 const errors=[],bad=[];await page.setViewportSize({width,height:1000});page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const user={id:owner?'3':'2',fullName:'Người kiểm thử',email:'fixture@example.invalid',roles:owner?['OWNER','CUSTOMER']:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 const party={id:'3',fullName:'Chủ nhà',email:'owner@example.invalid',phone:'0900000000',dateOfBirth:'1990-01-01',address:'Địa chỉ',documentNumber:'999000000001'};
 const snapshot={owner:party,customer:{...party,id:'2',fullName:'Khách thuê'},asset:{apartmentId:'5',propertyId:'4',propertyName:'Tài sản kiểm thử',title:'Phòng kiểm thử',roomNumber:'A.101',address:'Địa chỉ',amenities:[],areaM2:'30',bedrooms:1,bathrooms:1},receivingAccount:null};
 const stamp='2026-11-24T00:00:00Z';
 const draft=(id,o,c,status='DRAFT')=>({id:String(id),rentalRequestId:String(id),contractNumber:'HD-'+id,status,version:0,createdAt:stamp,startDate:'2027-01-01',endDate:'2028-01-01',monthlyRent:'3000000',deposit:'0',electricityUnitPrice:'3500',waterUnitPrice:'15000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[{title:'Thỏa thuận',body:'Nội dung'}],snapshot,signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:o&&c?'SIGNED':o?'WAITING_CUSTOMER':c?'WAITING_OWNER':'UNSIGNED',ownerSignedAt:o?stamp:null,customerSignedAt:c?stamp:null,ownerSignature:null,customerSignature:null,otpRequired:false}});
 const docs=[draft(1,false,false),draft(2,true,false),draft(3,false,true),draft(4,true,true),draft(5,true,true,'ACTIVE'),draft(6,true,false,'CANCELLED')];
 const signed=d=>!!d.signing.ownerSignedAt&&!!d.signing.customerSignedAt;
 const pdf=readFileSync('../../ancu-proptech-backend/target/compact-contract.pdf');
 await page.route('**/api/**',async route=>{
  if(owner){const summary=ownerSummaryFixture(route);if(summary)return summary;}
  const req=route.request(),url=new URL(req.url()),p=url.pathname,send=x=>route.fulfill({json:x});
  if(p.endsWith('/csrf'))return send({token:'fixture',headerName:'X-XSRF-TOKEN'});
  if(p.endsWith('/vneid-config'))return send({enabled:false});
  if(p.endsWith('/refresh'))return send({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
  if(p==='/api/v1/me')return send(user);
  if(p.endsWith('/me/tenancies')||p.endsWith('/owner/tenancies')||p.endsWith('/owner/apartments')||p.endsWith('/owner/maintenance-tickets'))return send([]);
  if(p.endsWith('/owner/properties'))return send([{id:'4',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
  if(p.endsWith('/contract-drafts'))return send(docs);
  if(p.endsWith('/rental-requests')){
   const items=docs.filter(d=>owner?(url.searchParams.get('contractCompleted')==='false'?!signed(d):true):!signed(d)).filter(d=>!url.searchParams.get('status')||(d.status==='CANCELLED'?'CANCELLED':'ACCEPTED')===url.searchParams.get('status')).map(d=>({id:d.id,apartmentId:'5',apartmentTitle:'Yêu cầu '+d.contractNumber,address:'Địa chỉ',advertisedMonthlyRent:'3000000',customerId:'2',customerName:'Khách thuê',customerEmail:'tenant@example.invalid',message:'Nhu cầu thuê',status:d.status==='CANCELLED'?'CANCELLED':'ACCEPTED',createdAt:stamp,version:0,contractId:d.id,contractCompleted:signed(d)}));return send({items,page:0,size:10,totalElements:items.length,totalPages:1});
  }
  if(p.endsWith('/owner/renewal-requests')||p.endsWith('/owner/invoices'))return send({items:[],page:0,totalElements:0,totalPages:0});
  if(p.includes('/notifications')||p.includes('/conversations'))return send({items:[],unreadCount:0,totalElements:0,totalPages:0});
  if(/\/contracts\/\d+$/.test(p))return send(docs.find(d=>d.id===p.split('/').pop()));
  if(p.endsWith('/pdf'))return route.fulfill({contentType:'application/pdf',body:pdf});
  bad.push(p);return route.fulfill({status:404,json:{message:'Unexpected fixture call'}});
 });
 const contracts=owner?'/app?tab=contracts&propertyId=4':'/my/contracts';
 await page.goto('http://localhost:3192'+contracts,{waitUntil:'networkidle'});
 await page.locator('#contract-4').waitFor();if(await page.getByTestId('contract-draft-card').count()!==2||await page.locator('#contract-2').count())throw Error('Unsigned appeared in Contract tab');
 if(owner){await page.goto('http://localhost:3192/app?tab=rental_requests&propertyId=4',{waitUntil:'networkidle'});await page.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');}
 else await page.getByRole('tab',{name:'Yêu cầu thuê đã gửi',exact:true}).click();
 await page.getByRole('heading',{name:'Yêu cầu HD-2',exact:true}).waitFor();
 if(await page.getByTestId('rental-request').count()!==(owner?3:4))throw Error('Missing draft requests');
 if(owner){if(!await page.getByRole('button',{name:'Xem / ký hợp đồng',exact:true}).count())throw Error('Owner sign action lost');}
 else{
  const card=page.getByTestId('rental-request').filter({hasText:'Yêu cầu HD-2'});await card.getByRole('link',{name:'Xem / ký hợp đồng',exact:true}).click();
  await page.getByRole('heading',{name:'Chi tiết hợp đồng',exact:true}).waitFor();
  await page.getByRole('link',{name:'← Yêu cầu thuê của tôi',exact:true}).click();await page.getByRole('heading',{name:'Yêu cầu HD-2',exact:true}).waitFor();
 }
 docs[1].signing.customerSignedAt=stamp;docs[1].signing.state='SIGNED';
 await page.goto('http://localhost:3192'+contracts,{waitUntil:'networkidle'});
 await page.locator('#contract-2').waitFor();if(await page.getByTestId('contract-draft-card').count()!==3)throw Error('Fully signed future contract did not move');
 if(width===390&&!owner)await page.screenshot({path:'F:/2026/Fa26/DTD/tmp/signed-contract-tabs-mobile.png',fullPage:true});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)||errors.length||bad.length)throw Error(JSON.stringify({errors,bad}));
 return {width,owner,unsignedInRequests:true,contractsOnlyBoth:true,futureSignedMoved:true};
}
// Registered scenarios
for(const width of [1440,390])for(const owner of [false,true])test(`Contract tabs after signing ${width} ${owner}`,async({page})=>{await exercise(page,width,owner);});

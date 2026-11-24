import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
const scenario=async(page,pdf,baseURL)=>{
 const results=[];for(const width of [1440,390])for(const actor of ['owner','customer']){
  const context=await page.context().browser().newContext({viewport:{width,height:900},baseURL});const p=await context.newPage();let otp=0,signs=0;const errors=[],failed=[];
  const user={id:actor==='owner'?'3':'2',fullName:'Tài khoản kiểm thử',email:'fixture@example.invalid',roles:[actor==='owner'?'OWNER':'CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const date=new Date();date.setUTCDate(date.getUTCDate()+2);const past=date.toISOString().slice(0,10);
  const party=id=>({id,fullName:id==='3'?'Chủ nhà kiểm thử':'Khách thuê kiểm thử',email:'fixture@example.invalid'});
  const draft={id:'42',rentalRequestId:'31',contractNumber:'HD-42',status:'DRAFT',version:0,startDate:past,endDate:'2028-12-31',monthlyRent:'5000000',deposit:'0',electricityUnitPrice:'3500',waterUnitPrice:'15000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[],createdAt:'2026-11-01T00:00:00Z',snapshot:{owner:party('3'),customer:party('2'),asset:{title:'Phòng kiểm thử',roomNumber:'A.101',address:'Đà Nẵng',amenities:[]}},signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:'SIGNED',ownerSignedAt:'2026-11-20T00:00:00Z',customerSignedAt:'2026-11-20T00:01:00Z'}};
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of 400/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
   await p.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;const json=body=>r.fulfill({json:body});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path.endsWith('/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/contracts/42/pdf'))return r.fulfill({contentType:'application/pdf',body:pdf});
    if(path.endsWith('/contracts/42/signature-otp')){otp++;return r.fulfill({status:400,json:{code:'CONTRACT_START_DATE_IN_PAST',message:'Ngày bắt đầu hợp đồng đã qua. Hãy kiểm tra lại ngày bắt đầu.'}});}
    if(path.endsWith('/contracts/42/signatures')){signs++;throw Error('Must not sign without OTP');}
    if(path.endsWith('/contracts/42'))return json(draft);return json([]);
   });
   await p.goto('/contracts/42');await p.getByText('Hợp đồng đã đủ hai chữ ký, chờ hiệu lực từ',{exact:false}).waitFor();
   if(await p.getByRole('button',{name:'Xác nhận ký hợp đồng',exact:true}).count())throw Error('Signed agreement still signable');
   if(actor==='owner')await p.getByText('Đã ký — chờ hiệu lực',{exact:true}).waitFor();
   if(await p.getByRole('button',{name:'Hủy / lịch sử làm hợp đồng',exact:true}).count()!==0)throw Error('Awaiting contract must not offer cancellation');
   if(otp||signs)throw Error('Incorrect requests');if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
   results.push({width,actor,signedWaiting:true,noSignCommands:true,errors,failed});
  }finally{await context.close();}
 }return results;
};
test('signed first lease waits for effective date and has no cancel button when awaiting activation',async({page,baseURL})=>{await scenario(page,readFileSync('../../ancu-proptech-backend/target/compact-contract.pdf'),baseURL);});

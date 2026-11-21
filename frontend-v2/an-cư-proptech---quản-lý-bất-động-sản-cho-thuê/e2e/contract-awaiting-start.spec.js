import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
const scenario=async(page,pdf,baseURL)=>{
 const results=[];for(const width of [1440,390])for(const actor of ['owner','customer']){
  const context=await page.context().browser().newContext({viewport:{width,height:900},baseURL});const p=await context.newPage();let otp=0,signs=0,actions=0;let cancelState=actor==='owner'?'NONE':'PENDING';const errors=[],failed=[];
  const user={id:actor==='owner'?'3':'2',fullName:'Tài khoản kiểm thử',email:'fixture@example.invalid',roles:[actor==='owner'?'OWNER':'CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const date=new Date();date.setUTCDate(date.getUTCDate()+2);const past=date.toISOString().slice(0,10);
  const party=id=>({id,fullName:id==='3'?'Chủ nhà kiểm thử':'Khách thuê kiểm thử',email:'fixture@example.invalid'});
  const draft={id:'42',rentalRequestId:'31',contractNumber:'HD-42',status:'DRAFT',version:0,startDate:past,endDate:'2028-12-31',monthlyRent:'5000000',deposit:'0',electricityUnitPrice:'3500',waterUnitPrice:'15000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[],createdAt:'2026-11-01T00:00:00Z',snapshot:{owner:party('3'),customer:party('2'),asset:{title:'Phòng kiểm thử',roomNumber:'A.101',address:'Đà Nẵng',amenities:[]}},signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:'SIGNED',ownerSignedAt:'2026-11-20T00:00:00Z',customerSignedAt:'2026-11-20T00:01:00Z'}};
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of 400/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
   draft.cancellationState=cancelState;
   const cancellation=()=>({requestId:'31',contractId:'42',apartmentTitle:'Phòng kiểm thử',requestStatus:cancelState==='CANCELLED'?'CANCELLED':'ACCEPTED',contractStatus:draft.status,signingState:'BOTH_SIGNED',state:cancelState,proposerId:'3',reason:'Hai bên chưa tiếp tục thuê',sourceVersion:'b'.repeat(64),canStart:cancelState==='NONE',canRespond:cancelState==='PENDING'&&actor==='customer',canWithdraw:cancelState==='PENDING'&&actor==='owner',history:[]});
   await p.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;const json=body=>r.fulfill({json:body});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path.endsWith('/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/contracts/42/pdf'))return r.fulfill({contentType:'application/pdf',body:pdf});
    if(path.endsWith('/contracts/42/signature-otp')){otp++;return r.fulfill({status:400,json:{code:'CONTRACT_START_DATE_IN_PAST',message:'Ngày bắt đầu hợp đồng đã qua. Hãy kiểm tra lại ngày bắt đầu.'}});}
    if(path.endsWith('/contracts/42/signatures')){signs++;throw Error('Must not sign without OTP');}
    if(path.endsWith('/rental-requests/31/cancellation/actions')){actions++;const body=r.request().postDataJSON();if(body.sourceVersion!=='b'.repeat(64))throw Error('Missing version');cancelState=body.action==='START'?'PENDING':'CANCELLED';draft.cancellationState=cancelState;if(cancelState==='CANCELLED')draft.status='CANCELLED';return json(cancellation());}
    if(path.endsWith('/rental-requests/31/cancellation'))return json(cancellation());
    if(path.endsWith('/contracts/42'))return json(draft);return json([]);
   });
   await p.goto('/contracts/42');await p.getByText('Hợp đồng đã đủ hai chữ ký, chờ hiệu lực từ',{exact:false}).waitFor();
   if(await p.getByRole('button',{name:'Xác nhận ký hợp đồng',exact:true}).count())throw Error('Signed agreement still signable');
   if(actor==='owner')await p.getByText('Đã ký — chờ hiệu lực',{exact:true}).waitFor();
   await p.getByRole('button',{name:'Hủy / lịch sử làm hợp đồng',exact:true}).click();const panel=p.getByRole('region',{name:'Hủy quá trình làm hợp đồng'});
   if(actor==='owner'){
    await panel.getByRole('button',{name:'Đề nghị hủy hợp đồng chưa hiệu lực',exact:true}).click();await panel.getByText('Bản này đã đủ hai chữ ký nhưng chưa có hiệu lực.',{exact:false}).waitFor();
    await panel.getByRole('textbox',{name:'Lý do xử lý hủy'}).fill('Hai bên chưa tiếp tục thuê');await panel.getByRole('button',{name:'Xác nhận gửi đề nghị hủy',exact:true}).click();await panel.getByRole('button',{name:'Rút đề nghị hủy',exact:true}).waitFor();
   }else{
    await panel.getByRole('button',{name:'Đồng ý hủy',exact:true}).click();await panel.getByRole('button',{name:'Xác nhận đồng ý hủy',exact:true}).click();await p.getByText('Đã hủy trước hiệu lực',{exact:true}).waitFor();
   }
   if(actions!==1||otp||signs)throw Error('Incorrect requests');if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
   results.push({width,actor,signedWaiting:true,bilateralCancellation:true,noSignCommands:true,errors,failed});
  }finally{await context.close();}
 }return results;
};
test('signed first lease waits for effective date and supports bilateral cancellation on desktop/mobile',async({page,baseURL})=>{await scenario(page,readFileSync('../../ancu-proptech-backend/target/compact-contract.pdf'),baseURL);});

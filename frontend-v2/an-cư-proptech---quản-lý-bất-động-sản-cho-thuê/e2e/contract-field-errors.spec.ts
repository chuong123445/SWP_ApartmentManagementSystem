import {test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ownerSummaryFixture} from './fixtures/ownerSummary';
import {contractToday} from '../src/utils/contract';

async function exercise(page:Page,width:number,scenario:string){
  const today=contractToday();const yesterday=new Date(`${today}T00:00:00Z`);yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const errors:string[]=[],unexpected:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&!e.text().includes('status of 503')&&!e.text().includes('status of 409')&&!e.text().includes('status of 400'))consoleErrors.push(e.text());});
  const user={id:'3',fullName:'Chủ nhà kiểm thử',email:'owner@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const party={id:'3',fullName:user.fullName,email:user.email,phone:'0900000000',dateOfBirth:'1990-01-01',address:'Đà Nẵng',documentNumber:'999000000001'};
  const snapshot={owner:party,customer:{...party,id:'2',fullName:'Khách thuê kiểm thử'},asset:{apartmentId:'5',propertyId:'4',propertyName:'Tài sản kiểm thử',title:'Phòng trọ',roomNumber:'208',address:'Đà Nẵng',amenities:[],areaM2:'45',bedrooms:3,bathrooms:2},receivingAccount:null};
  const clauses=[{title:'Thỏa thuận thuê',body:'Giữ gìn tài sản đã bàn giao.'}];
  let saved:any=scenario==='expired'?{id:'42',version:0,status:'DRAFT',contractNumber:'HD-42',startDate:yesterday.toISOString().slice(0,10),endDate:`${Number(today.slice(0,4))+1}${today.slice(4)}`,monthlyRent:'2600000',deposit:'2600000',electricityUnitPrice:'3800',waterUnitPrice:'50000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses,snapshot,signing:{state:'UNSIGNED',ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64)}}:null,postCount=0,putCount=0,pdfCount=0,failedSave=false,failedPdf=false;
  const pdf=readFileSync('../../ancu-proptech-backend/target/compact-contract.pdf');
  await page.route('**/api/**',async route=>{
    const summary=ownerSummaryFixture(route);if(summary)return summary;
    const req=route.request(),url=new URL(req.url()),path=url.pathname,json=(body:unknown)=>route.fulfill({json:body});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/owner/properties'))return json([{id:'4',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
    if(path.endsWith('/owner/rental-requests'))return json({items:url.searchParams.get('status')==='ACCEPTED'?[{id:'31',apartmentId:'5',apartmentTitle:'Phòng kiểm thử',advertisedMonthlyRent:'2600000',customerId:'2',customerName:'Khách thuê kiểm thử',customerEmail:'tenant@example.invalid',status:'ACCEPTED',createdAt:'2026-11-03T00:00:00Z',version:0,contractCompleted:false}]:[],page:0,totalElements:1,totalPages:1});
    if(path.endsWith('/contract-context'))return json({rentalRequestId:'31',requestVersion:0,sourceVersion:'a'.repeat(64),snapshot,advertisedMonthlyRent:'2600000',suggestedDeposit:'2600000',suggestedRates:{electricityUnitPrice:'3800',waterUnitPrice:'50000',waterBillingMode:'PER_PERSON'},templateClauses:clauses,existingDraft:saved});
    if(path.endsWith('/rental-requests/31/contract')||path.endsWith('/contracts/42/draft')){
      if(req.method()==='POST')postCount++;else if(req.method()==='PUT')putCount++;else throw Error('Wrong method');
      if(scenario==='server'&&!failedSave){failedSave=true;return route.fulfill({status:400,json:{code:'CONTRACT_TERM_TOO_SHORT',message:'Kiểm tra lại ngày kết thúc từ server.'}});}
      if(scenario==='stale')return route.fulfill({status:409,json:{code:'SOURCE_CHANGED',message:'Thông tin đã thay đổi. Hãy tải lại.'}});
      if(scenario==='network'&&!failedSave){failedSave=true;return route.fulfill({status:503,json:{message:'Không lưu được bản nháp.'}});}
      const body=req.postDataJSON();saved={...body,oneMonthRentPackage:false,calendarRentBilling:true,id:'42',rentalRequestId:'31',contractNumber:'HD-42',status:'DRAFT',version:putCount,snapshot,createdAt:'2026-11-03T00:00:00Z',signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:'UNSIGNED'}};
      return json(saved);
    }
    if(path.endsWith('/contracts/42/pdf')){pdfCount++;if(scenario==='pdf-error'&&!failedPdf)return route.fulfill({status:503,json:{message:'Chưa tải được PDF.'}});return route.fulfill({contentType:'application/pdf',body:pdf});}
    if(path.endsWith('/owner/invoices'))return json({items:[],page:0,totalElements:0,totalPages:0});
    if(['/api/v1/owner/apartments','/api/v1/owner/tenancies','/api/v1/me/tenancies','/api/v1/owner/maintenance-tickets'].includes(path))return json([]);
    unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
  });

  await page.setViewportSize({width,height:950});await page.goto('/app?tab=rental_requests&propertyId=4');
  await page.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');await page.getByRole('button',{name:'Tạo hợp đồng',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  if(scenario==='expired'){
    await dialog.getByText('Ngày bắt đầu đã qua, vui lòng cập nhật lại ngày bắt đầu.',{exact:true}).waitFor();
    await dialog.getByRole('button',{name:'Cập nhật ngày bắt đầu',exact:true}).click();
    await dialog.getByLabel('Tiền đặt cọc (VND)',{exact:true}).fill('900000');
  }else{for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();}
  const start=dialog.getByLabel('Ngày bắt đầu',{exact:true}),end=dialog.getByLabel('Ngày kết thúc',{exact:true});
  if(await dialog.locator('[data-contract-field][aria-invalid="true"]').count())throw Error('Errors shown on entry');
  if(await dialog.getByText('Ngày bắt đầu đã qua, vui lòng cập nhật lại ngày bắt đầu.',{exact:true}).count())throw Error('Empty date mistaken for past');
  if(await dialog.getByText('Tiền thuê theo tháng lịch: kỳ đầu gồm phần tháng bắt đầu',{exact:false}).count())throw Error('Long policy paragraph remains');
  await start.fill('2020-01-01');await start.blur();
  if(await dialog.locator('[data-contract-field][aria-invalid="true"]').count()||await dialog.locator('#contract-error-startDate').count())throw Error('Validation before Next');
  await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();
  await dialog.locator('#contract-error-startDate').waitFor();
  if(await start.locator('..').getByRole('alert').count()!==1)throw Error('Duplicate start messages');
  if(await dialog.getByText('Ngày bắt đầu đã qua, vui lòng cập nhật lại ngày bắt đầu.',{exact:true}).count())throw Error('Duplicate past hint');

  const add=(days:number)=>{const d=new Date(`${today}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  await start.fill(add(1));await end.fill(add(1));
  const rent=dialog.getByLabel('Tiền thuê mỗi tháng (VND)',{exact:true});await rent.fill('0');
  const due=dialog.getByLabel('Ngày đến hạn các kỳ tiếp theo (1–28)',{exact:true});await due.fill('29');
  const method=dialog.getByLabel('Phương thức thanh toán',{exact:true});await method.fill('');
  await method.scrollIntoViewIfNeeded();await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();
  await dialog.locator('#contract-error-endDate').waitFor();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('data-contract-field')==='endDate');
  const located=await end.evaluate(el=>{const area=el.closest('.overflow-y-auto'),id=el.getAttribute('aria-describedby');if(!area||!id)return false;const a=area.getBoundingClientRect(),r=el.getBoundingClientRect(),message=document.getElementById(id);return !!message&&r.top>=a.top&&message.getBoundingClientRect().bottom<=a.bottom&&message.parentElement===el.parentElement;});
  if(!located)throw Error('Date error not beside field and visible');
  if(width===390&&scenario==='client')await page.screenshot({path:'F:/2026/Fa26/DTD/tmp/contract-inline-errors-mobile.png',fullPage:true});
  await end.fill(add(120));if(await end.getAttribute('aria-invalid')!=='false'||await rent.getAttribute('aria-invalid')!=='true')throw Error('Field correction hid unrelated errors');
  await rent.fill('3000000');await due.fill('5');await method.fill('Chuyển khoản');
  await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();
  const title=dialog.getByLabel('Tiêu đề điều khoản 1',{exact:true}),body=dialog.getByLabel('Nội dung điều khoản 1',{exact:true});
  await title.fill('');await body.fill('');await dialog.getByRole('button',{name:'Rà soát và xác nhận →',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('data-contract-field')==='clauses.0.title');
  await title.fill('Điều khoản kiểm thử');if(await body.getAttribute('aria-invalid')!=='true')throw Error('Body error disappeared');await body.fill('Nội dung đã sửa');
  await dialog.getByRole('button',{name:'Rà soát và xác nhận →',exact:true}).click();
  await dialog.getByRole('button',{name:'Xác nhận tạo hợp đồng',exact:true}).click();
  if(scenario==='server'){
    await dialog.locator('#contract-error-endDate').filter({hasText:'Kiểm tra lại ngày kết thúc từ server.'}).waitFor();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-contract-field')==='endDate');
    if(await rent.inputValue()!=='3000000')throw Error('Server validation discarded edits');
    await end.fill(add(121));await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();await dialog.getByRole('button',{name:'Rà soát và xác nhận →',exact:true}).click();await dialog.getByRole('button',{name:'Xác nhận tạo hợp đồng',exact:true}).click();
  }else if(scenario==='network'){
    await dialog.getByRole('alert').filter({hasText:'Không lưu được bản nháp.'}).waitFor();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='alert');
    if(await dialog.locator('[data-contract-field][aria-invalid="true"]').count())throw Error('Network failure attributed to input');
    await dialog.getByRole('button',{name:'Xác nhận tạo hợp đồng',exact:true}).click();
  }
  await dialog.getByTitle('Bản PDF hợp đồng HD-42').waitFor();
  if(postCount!==(scenario==='client'?1:2)||saved.monthlyRent!=='3000000'||saved.clauses[0].body!=='Nội dung đã sửa')throw Error('Save/retry discarded values');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)||await dialog.evaluate(el=>el.scrollWidth>el.clientWidth)||errors.length||unexpected.length||consoleErrors.length)throw Error(JSON.stringify({errors,unexpected,consoleErrors}));
  return {width,scenario,inline:true,focused:true,preserved:true,postCount};
}

for(const width of [1440,390])for(const scenario of ['client','server','network'])test(`Contract inline errors ${scenario} ${width}`,async({page})=>{await exercise(page,width,scenario);});

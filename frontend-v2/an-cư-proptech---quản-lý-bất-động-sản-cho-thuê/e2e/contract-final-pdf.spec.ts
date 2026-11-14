import { test, expect } from '@playwright/test';
import { ownerSummaryFixture } from './fixtures/ownerSummary';
import { readFileSync } from 'node:fs';

for(const width of [1440,390])for(const scenario of ['create-edit','save-error','pdf-error','stale'] as const)test(`Final PDF ${scenario} at ${width}px`,async({page})=>{
  const errors:string[]=[],unexpected:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&!e.text().includes('status of 503')&&!e.text().includes('status of 409'))consoleErrors.push(e.text());});
  const user={id:'3',fullName:'Chủ nhà kiểm thử',email:'owner@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const party={id:'3',fullName:user.fullName,email:user.email,phone:'0900000000',dateOfBirth:'1990-01-01',address:'Đà Nẵng',documentNumber:'999000000001'};
  const snapshot={owner:party,customer:{...party,id:'2',fullName:'Khách thuê kiểm thử'},asset:{apartmentId:'5',propertyId:'4',propertyName:'Tài sản kiểm thử',title:'Phòng trọ',roomNumber:'208',address:'Đà Nẵng',amenities:[],areaM2:'45',bedrooms:3,bathrooms:2},receivingAccount:null};
  const clauses=[{title:'Thỏa thuận thuê',body:'Giữ gìn tài sản đã bàn giao.'}];
  let saved:any=null,postCount=0,putCount=0,pdfCount=0,failedSave=false,failedPdf=false;
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
      if(scenario==='stale')return route.fulfill({status:409,json:{code:'SOURCE_CHANGED',message:'Thông tin đã thay đổi. Hãy tải lại.'}});
      if(scenario==='save-error'&&!failedSave){failedSave=true;return route.fulfill({status:503,json:{message:'Không lưu được bản nháp.'}});}
      const body=req.postDataJSON();saved={...body,id:'42',rentalRequestId:'31',contractNumber:'HD-42',status:'DRAFT',version:putCount,snapshot,createdAt:'2026-11-03T00:00:00Z',signing:{ownerAccountId:'3',customerAccountId:'2',contentHash:'a'.repeat(64),state:'UNSIGNED'}};
      return json(saved);
    }
    if(path.endsWith('/contracts/42/pdf')){pdfCount++;if(scenario==='pdf-error'&&!failedPdf)return route.fulfill({status:503,json:{message:'Chưa tải được PDF.'}});return route.fulfill({contentType:'application/pdf',body:pdf});}
    if(path.endsWith('/owner/invoices'))return json({items:[],page:0,totalElements:0,totalPages:0});
    if(['/api/v1/owner/apartments','/api/v1/owner/tenancies','/api/v1/me/tenancies','/api/v1/owner/maintenance-tickets'].includes(path))return json([]);
    unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
  });
  await page.setViewportSize({width,height:950});await page.goto('/app?tab=rental_requests&propertyId=4');
  await page.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');await page.getByRole('button',{name:'Tạo hợp đồng',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();
  await dialog.getByLabel('Ngày bắt đầu',{exact:true}).fill('2026-11-03');await dialog.getByLabel('Ngày kết thúc',{exact:true}).fill('2027-11-03');
  await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();
  await dialog.getByRole('button',{name:'Rà soát và xác nhận →',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Ký xác nhận',exact:false})).toHaveCount(0);
  await expect(dialog.getByTitle('Bản PDF hợp đồng HD-42')).toHaveCount(0);
  if(!saved){expect(postCount).toBe(0);expect(pdfCount).toBe(0);}
  await dialog.getByRole('button',{name:saved?'Xác nhận lưu thay đổi':'Xác nhận tạo hợp đồng',exact:true}).click();
  if(scenario==='stale'){
    await expect(dialog.getByRole('button',{name:'Tải lại thông tin',exact:true})).toBeVisible();expect(postCount).toBe(1);expect(pdfCount).toBe(0);
    await expect(dialog.getByRole('button',{name:'Xác nhận tạo hợp đồng',exact:true})).toBeDisabled();
  }else{
    if(scenario==='save-error'){await expect(dialog.getByText('Không lưu được bản nháp.',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Xác nhận tạo hợp đồng',exact:true}).click();}
    if(scenario==='pdf-error'){await expect(dialog.getByText('Chưa tải được PDF.',{exact:true})).toBeVisible();failedPdf=true;await dialog.getByRole('button',{name:'Tải lại PDF',exact:true}).click();}
    await expect(dialog.getByTitle('Bản PDF hợp đồng HD-42')).toBeVisible();
    await expect(dialog.locator('#contract-preview')).toHaveCount(0);
    await expect(dialog.getByRole('heading',{name:'Tài sản cho thuê',exact:true})).toHaveCount(0);
    expect(postCount).toBe(scenario==='save-error'?2:1);
    if(scenario==='create-edit'){
      await dialog.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();
      await dialog.getByLabel('Tiền thuê mỗi tháng (VND)',{exact:true}).fill('2700000');
      await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();await dialog.getByRole('button',{name:'Rà soát và xác nhận →',exact:true}).click();
      await expect(dialog.getByRole('heading',{name:'Ký xác nhận',exact:false})).toHaveCount(0);
      await expect(dialog.getByTitle('Bản PDF hợp đồng HD-42')).toHaveCount(0);
      if(!saved){expect(postCount).toBe(0);expect(pdfCount).toBe(0);}
      await dialog.getByRole('button',{name:saved?'Xác nhận lưu thay đổi':'Xác nhận tạo hợp đồng',exact:true}).click();
      await expect(dialog.getByTitle('Bản PDF hợp đồng HD-42')).toBeVisible();expect(putCount).toBe(1);expect(postCount).toBe(1);expect(saved.monthlyRent).toBe('2700000');
    }
  }
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(consoleErrors).toEqual([]);
});

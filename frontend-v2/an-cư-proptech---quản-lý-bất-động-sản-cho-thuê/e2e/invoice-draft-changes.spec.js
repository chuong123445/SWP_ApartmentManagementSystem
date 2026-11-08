import { test } from '@playwright/test';

const scenario = async(page,baseURL,outputPath)=>{
 const results=[];const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 for(const width of [1440,390]){
  const ctx=await page.context().browser().newContext();const p=await ctx.newPage();const errors=[],failed=[],commands=[];let conflict=true,historyFail=false;
  const user={id:'1',email:'owner@example.invalid',fullName:'Owner kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:1};
  let invoice={id:'101',contractId:'10',apartmentId:'11',customerId:'2',roomNumber:'A101',apartmentTitle:'Phòng kiểm thử',tenantName:'Khách thuê',period:'2026-11',dueDate:'2026-11-28',monthlyRent:'5000000',electricityStartReading:'1000',electricityEndReading:'1120',electricityQuantity:'120',electricityUnitPrice:'3500',electricityAmount:'420000',waterStartReading:'200',waterEndReading:'208',waterQuantity:'8',waterUnitPrice:'15000',waterAmount:'120000',totalAmount:'5540000',status:'DRAFT',createdAt:'2026-11-08T01:00:00Z',sentAt:null,version:0,billingVersion:1,paymentStatus:'UNPAID',waterBillingMode:'METERED',occupantCount:2,internetFee:'0',garbageFee:'0'};
  const events=[{id:'1',actorId:'1',action:'CREATED',occurredAt:'2026-11-08T01:00:00Z',reason:null,before:null,after:{...invoice}}];
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of (409|503)/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
   await p.route('https://accounts.google.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){},cancel(){}}}}'}));
   await p.route('**/api/**',async r=>{
    const req=r.request(),url=new URL(req.url()),path=url.pathname,json=body=>r.fulfill({json:body});
    if(path.endsWith('/auth/refresh'))return json({accessToken:'fixture',expiresIn:900,user});if(path.endsWith('/auth/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});if(path.endsWith('/auth/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
    if(path==='/api/v1/invoices/101')return json(invoice);
    if(path==='/api/v1/owner/invoices/101/history')return historyFail?r.fulfill({status:503,json:{message:'Lịch sử tạm thời không tải được.'}}):json(events);
    if(path==='/api/v1/owner/invoices/101/draft'){
     const body=req.postDataJSON();commands.push({path,method:req.method(),body});check(req.method()==='PATCH','Edit method wrong');check(body.version===invoice.version&&body.billingVersion===invoice.billingVersion,'Missing fresh version tokens');check(!('totalAmount'in body)&&!('electricityUnitPrice'in body),'Client sends price/total');
     if(conflict){conflict=false;invoice={...invoice,version:1,billingVersion:2};return r.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Hóa đơn đã thay đổi. Hãy tải lại.'}});}
     const before={...invoice};invoice={...invoice,electricityEndReading:body.electricityEndReading,electricityQuantity:'130.25',electricityAmount:'455875',waterEndReading:body.waterEndReading,waterQuantity:'9.50',waterAmount:'142500',dueDate:body.dueDate,totalAmount:'5598375',version:2,billingVersion:3};events.push({id:'2',actorId:'1',action:'UPDATED',occurredAt:'2026-11-08T01:02:00Z',reason:body.reason,before,after:{...invoice}});return json(invoice);
    }
    if(path==='/api/v1/owner/invoices/101/cancel'){
     const body=req.postDataJSON();commands.push({path,method:req.method(),body});check(req.method()==='POST'&&body.version===2&&body.billingVersion===3&&body.reason==='Không phát hành kỳ này','Cancel command stale/invalid');const before={...invoice};invoice={...invoice,status:'CANCELLED',version:3,billingVersion:4};events.push({id:'3',actorId:'1',action:'CANCELLED',occurredAt:'2026-11-08T01:03:00Z',reason:body.reason,before,after:{...invoice}});return json(invoice);
    }
    if(path.endsWith('/owner/invoices')){const filter=url.searchParams.get('filter');const items=!filter||filter==='ALL'||filter===invoice.status?[invoice]:[];return json({items,page:0,size:20,totalPages:items.length?1:0,totalElements:items.length});}
    if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-08',expiringThrough:'2026-11-28',unpaidCount:0,unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,expiringContractCount:0,expiredContractCount:0});
    if(path.endsWith('/owner/properties'))return json([{id:'1',name:'Tòa Một',address:'Test',city:'Test',district:'Test',approvalStatus:'APPROVED',version:0}]);
    if(path.endsWith('/owner/apartments'))return json([{id:'11',propertyId:'1',propertyName:'Tòa Một',ownerId:'1',roomNumber:'A101',title:'Room',areaM2:'25',advertisedMonthlyRent:'5000000',availability:'OCCUPIED',publicationStatus:'PUBLISHED',amenities:[],version:0}]);
    if(path.endsWith('/owner/tenancies'))return json([]);if(path.includes('notifications'))return json({items:[],unreadCount:0});if(path.includes('invoices')||path.includes('maintenance-tickets'))return json({items:[],totalElements:0,totalPages:0,page:0,size:20});if(!['GET','HEAD'].includes(req.method()))throw Error('Unexpected write '+path);return json([]);
   });
   await p.setViewportSize({width,height:1000});await p.goto(new URL('/app?tab=invoices',baseURL).href);
   await p.getByRole('button',{name:'Sửa / hủy · Lịch sử',exact:true}).click();let dialog=p.getByRole('dialog',{name:'Hóa đơn và lịch sử thay đổi'});
   await dialog.getByLabel('Chỉ số điện cuối kỳ (kWh)',{exact:true}).fill('1130.25');await dialog.getByLabel('Chỉ số nước cuối kỳ (m³)',{exact:true}).fill('209.50');await dialog.getByLabel('Hạn đóng',{exact:true}).fill('2026-11-10');await dialog.getByLabel('Lý do sửa hoặc hủy',{exact:true}).fill('Sửa chỉ số sai');await dialog.getByRole('button',{name:'Lưu thay đổi bản nháp',exact:true}).click();
   await dialog.getByRole('alert').filter({hasText:'Hóa đơn đã thay đổi'}).waitFor();check(await dialog.getByLabel('Chỉ số điện cuối kỳ (kWh)',{exact:true}).inputValue()==='1130.25','Conflict discards input');check(await dialog.getByRole('button',{name:'Lưu thay đổi bản nháp',exact:true}).isDisabled(),'Stale form still writable');check(commands.length===1,'Automatic mutation retry');
   await dialog.getByRole('button',{name:'Tải lại hóa đơn và lịch sử',exact:true}).click();await dialog.getByLabel('Chỉ số điện cuối kỳ (kWh)',{exact:true}).fill('1130.25');await dialog.getByLabel('Chỉ số nước cuối kỳ (m³)',{exact:true}).fill('209.50');await dialog.getByLabel('Hạn đóng',{exact:true}).fill('2026-11-10');await dialog.getByLabel('Lý do sửa hoặc hủy',{exact:true}).fill('Sửa chỉ số sai');await dialog.getByRole('button',{name:'Lưu thay đổi bản nháp',exact:true}).click();
   await dialog.getByRole('status').filter({hasText:'Đã lưu và tính lại'}).waitFor();await dialog.getByText('Sửa bản nháp',{exact:true}).waitFor();check((await dialog.innerText()).includes('5.598.375 đ'),'Server total missing');
   await dialog.getByText('Xem dữ liệu trước/sau',{exact:true}).last().click();check(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Page overflow');check(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Dialog overflow');await p.screenshot({path:outputPath(`fix08-edit-${width}.png`),fullPage:true});
   await dialog.getByLabel('Lý do sửa hoặc hủy',{exact:true}).fill('Không phát hành kỳ này');await dialog.getByRole('button',{name:'Hủy bản nháp',exact:true}).click();check(commands.length===2,'Cancelled without confirmation');await dialog.getByRole('button',{name:'Xác nhận hủy bản nháp',exact:true}).click();await dialog.getByRole('status').filter({hasText:'Đã hủy bản nháp'}).waitFor();check(await dialog.getByRole('button',{name:'Lưu thay đổi bản nháp',exact:true}).count()===0,'Cancelled invoice editable');await dialog.getByRole('button',{name:'Đóng hóa đơn và lịch sử',exact:true}).click();
   await p.getByRole('button',{name:'Đã hủy',exact:true}).click();await p.locator('[data-invoice-id="101"]').getByText('Đã hủy',{exact:true}).waitFor();check(await p.getByRole('button',{name:'Gửi người thuê',exact:true}).count()===0,'Cancelled invoice send button');await p.getByRole('button',{name:'Lịch sử',exact:true}).click();dialog=p.getByRole('dialog',{name:'Hóa đơn và lịch sử thay đổi'});await dialog.getByText('Hủy bản nháp',{exact:true}).waitFor();check(await dialog.locator('textarea').count()===0,'Cancelled history has edit form');await p.screenshot({path:outputPath(`fix08-cancel-${width}.png`),fullPage:true});
   historyFail=true;await dialog.getByRole('button',{name:'Tải lại hóa đơn và lịch sử',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Lịch sử tạm thời không tải được'}).waitFor();historyFail=false;await dialog.getByRole('button',{name:'Tải lại hóa đơn và lịch sử',exact:true}).click();await dialog.getByText('Hủy bản nháp',{exact:true}).waitFor();
   check(!errors.length&&!failed.length,'Browser errors '+JSON.stringify({errors,failed}));check(commands.length===3,'Unexpected command count');results.push({width,passed:true,commands:commands.length,staleVersionRetainedInput:true,explicitReload:true,serverTotal:true,historyBeforeAfter:true,cancelConfirmation:true,cancelledReadOnly:true,historyErrorRetry:true,overflow:false,errors,failed});
  }catch(e){throw Error(String(e)+' BODY '+(await p.locator('body').innerText()).slice(-5000)+' DIAG '+JSON.stringify({errors,failed,commands}));}finally{await ctx.close();}
 }
 return results;
}
;

test('Owner draft edit/cancel/history, conflicts and responsive layout', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(60000);
  await scenario(page, baseURL, name => testInfo.outputPath(name));
});

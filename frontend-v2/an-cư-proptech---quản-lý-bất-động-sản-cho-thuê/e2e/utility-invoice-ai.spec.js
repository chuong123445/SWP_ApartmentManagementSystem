import {test} from '@playwright/test';

async function separateBilling(page,baseURL,outputPath){
const results=[];const check=(v,m)=>{if(!v)throw Error(m);};
for(const width of [1440,390])for(const mode of ['OWNER']){
 const context=await page.context().browser().newContext({viewport:{width,height:1000}});const p=await context.newPage();p.setDefaultTimeout(15000);
 const customer=mode.startsWith('CUSTOMER');const errors=[],unexpected=[],commands=[];let saved=null,settingsSaved=false;
 const user={id:customer?'2':'1',email:'party@example.invalid',fullName:customer?'Khách thuê':'Chủ nhà',roles:customer?['CUSTOMER']:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 const base={id:'91',contractId:'42',apartmentId:'21',customerId:'2',roomNumber:'A.102',apartmentTitle:'Phòng A.102',tenantName:'Khách thuê',period:'2026-11',dueDate:'2026-11-05',monthlyRent:'30000000',coverageStart:'2026-11-01',coverageEnd:'2027-04-30',rentMonths:6,rentUnitPrice:'5000000',electricityStartReading:'300',electricityEndReading:'400',electricityQuantity:'100',electricityUnitPrice:'3500',electricityAmount:'350000',waterStartReading:'20',waterEndReading:'25',waterQuantity:'5',waterUnitPrice:'15000',waterAmount:'75000',internetFee:'0',garbageFee:'0',totalAmount:'30000000',status:'SENT',createdAt:'2026-11-01T00:00:00Z',version:0,billingVersion:0,kind:'RENT'};
 const invoice=mode==='CUSTOMER_UTILITY'?{...base,kind:'UTILITY',monthlyRent:'0',totalAmount:'425000',rentMonths:0}:base;
 const meter={contractId:'42',apartmentId:'21',roomNumber:'A.102',tenantName:'Khách thuê',period:'2026-11',monthlyRent:'5000000',electricityStartReading:'300',electricityUnitPrice:'3500',waterStartReading:'20',waterUnitPrice:'15000',baselineVersion:0,waterBillingMode:'METERED',internetFee:'0',garbageFee:'0'};
 const snapshot={owner:{id:'1',fullName:'Chủ nhà',email:'owner@example.invalid'},customer:{id:'2',fullName:'Khách thuê',email:'customer@example.invalid'},asset:{apartmentId:'21',propertyId:'11',propertyName:'Tòa A',roomNumber:'A.102',title:'Phòng A.102',address:'28 Đường số 2',areaM2:'30',amenities:[],approvalStatus:'APPROVED'},receivingAccount:null};
 try{
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/**',async r=>{
 const path=new URL(r.request().url()).pathname;const json=body=>r.fulfill({json:body});const body=()=>r.request().postDataJSON();
 if(path.endsWith('/utility-invoice-suggestion')){
   const input=body();if(!input.message.includes('nước cuối tháng 25'))return r.fulfill({status:422,json:{message:'Cần cung cấp chỉ số nước cuối kỳ mới lập được hóa đơn.'}});
   return json({contractId:'42',roomNumber:'A.102',period:'2026-11',baselineVersion:0,electricityEndReading:'400',waterEndReading:'25'});
 }
 if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
 if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'fixture'});
 if(path.endsWith('/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
 if(path.endsWith('/me/notifications'))return json({items:[],totalPages:0,totalElements:0,unreadCount:0});
 if(path.endsWith('/owner/financial-summary'))return json({});
 if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-11',expiringThrough:'2026-12-11',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
 if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa A',approvalStatus:'APPROVED'}]);
 if(path.endsWith('/me/tenancies'))return json([]);
 if(path.endsWith('/owner/tenancies'))return json([{id:'42',apartmentId:'21',roomNumber:'A.102',apartmentTitle:'Phòng A.102',propertyName:'Tòa A',customerId:'2',customerName:'Khách thuê',customerEmail:'tenant@example.invalid',status:'ACTIVE',startDate:'2026-11-01',endDate:'2027-10-31',monthlyRent:'5000000',version:0}]);
 if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa A',ownerId:'1',roomNumber:'A.102',title:'Phòng A.102',areaM2:'30',advertisedMonthlyRent:'5000000',deposit:'10000000',electricityIndex:300,waterIndex:20,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
 if(path.endsWith('/42/billing-context'))return json(meter);
 if(path.endsWith('/42/rent-billing-context'))return json({contractId:'42',cycleMonths:6,coverageStart:'2026-11-01',coverageEnd:'2027-04-30',months:6,monthlyRent:'5000000',totalAmount:'30000000',dueDate:'2026-11-05',billingVersion:0,existingDraftId:null,hasPartialDays:true,automationMode:'DRAFT'});
 if(path.endsWith('/42/rent-invoices')){commands.push(body());check(Object.keys(body()).sort().join(',')==='billingVersion,coverageStart,dueDate','Rent sends utility fields or caller money');saved={...base,status:'DRAFT',electricityAmount:'0',waterAmount:'0'};return json(saved);}
 if(path.endsWith('/42/invoices')){commands.push(body());check(body().electricityEndReading==='400'&&body().waterEndReading==='25','Utility readings missing');saved={...base,id:'92',kind:'UTILITY',monthlyRent:'0',totalAmount:'425000',status:'DRAFT'};return json(saved);}
 if(path.endsWith('/91/send')||path.endsWith('/92/send')){saved={...saved,status:'SENT'};return json(saved);}
 if(path.endsWith('/owner/invoices/additional'))return json({items:[],totalPages:0,totalElements:0,page:0});
 if(path.endsWith('/owner/invoices'))return json({items:saved?[saved]:[],totalPages:1,totalElements:saved?1:0,page:0});
 if(path.endsWith('/owner/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0,page:0});
 if(path.endsWith('/11/settings')){if(r.request().method()==='PUT'){check(body().rentInvoiceMode==='SEND','Automation mode not sent');settingsSaved=true;return json({propertyId:'11',propertyName:'Tòa A',configured:true,version:2,...body()});}return json({propertyId:'11',propertyName:'Tòa A',configured:true,version:1,waterBillingMode:'METERED',rentInvoiceMode:'DRAFT',electricityUnitPrice:'3500',waterUnitPrice:'15000',internetFee:'0',garbageFee:'0'});}
 if(path.endsWith('/owner/payment-qr/current'))return json(null);
 if(path.endsWith('/11/payment-qr'))return json({configured:false});
 if(path==='/api/v1/invoices/91')return json(invoice);
 if(path==='/api/v1/invoices/91/payment')return json({status:'PLATFORM_UNAVAILABLE',amount:invoice.totalAmount});
 if(path.endsWith('/owner/rental-requests'))return json({items:[{id:'31',apartmentId:'21',apartmentTitle:'Phòng A.102',advertisedMonthlyRent:'5000000',customerId:'2',customerName:'Khách thuê',customerEmail:'tenant@example.invalid',status:'ACCEPTED',createdAt:'2026-11-11T00:00:00Z',version:0,contractCompleted:false}],page:0,totalElements:1,totalPages:1});
 if(path.endsWith('/contract-context'))return json({rentalRequestId:'31',requestVersion:0,sourceVersion:'a'.repeat(64),snapshot,advertisedMonthlyRent:'5000000',suggestedDeposit:'5000000',suggestedRates:{electricityUnitPrice:'3500',waterUnitPrice:'15000'},templateClauses:[{title:'Điều khoản',body:'Thỏa thuận thuê.'}],existingDraft:null});
 unexpected.push(r.request().method()+' '+path);return json([]);
 });
 await p.setViewportSize({width,height:1000});
 if(mode==='OWNER'){
 await p.goto(new URL('/app?tab=invoices&propertyId=11',baseURL).href);
 await p.locator('#btn-create-invoice-page').click();const dialog=p.getByRole('dialog',{name:'Lập hóa đơn',exact:true});
 const input=dialog.getByRole('textbox',{name:'Yêu cầu AI điền hóa đơn',exact:true});
 await input.fill('Phòng A.102, chỉ số điện cuối tháng 400');await dialog.getByRole('button',{name:'AI điền hóa đơn',exact:true}).click();
 await dialog.getByRole('alert').filter({hasText:'Cần cung cấp chỉ số nước'}).waitFor();check(commands.length===0,'Missing readings created invoice');
 await input.fill('Phòng A.102, chỉ số điện cuối tháng 400, nước cuối tháng 25');await dialog.getByRole('button',{name:'AI điền hóa đơn',exact:true}).click();
 await dialog.getByRole('button',{name:'Áp dụng chỉ số để lập hóa đơn',exact:true}).waitFor();
 check(await dialog.getByRole('spinbutton',{name:/^Chỉ số điện cuối kỳ/}).inputValue()==='','AI applied without review');
 await input.fill('Phòng A.102, chỉ số điện cuối tháng 401, nước cuối tháng 25');
 check(await dialog.getByRole('button',{name:'Áp dụng chỉ số để lập hóa đơn',exact:true}).count()===0,'Stale result stayed applicable');
 await input.fill('Phòng A.102, chỉ số điện cuối tháng 400, nước cuối tháng 25');
 await dialog.getByRole('button',{name:'Áp dụng chỉ số để lập hóa đơn',exact:true}).click();
 check(await dialog.getByRole('spinbutton',{name:/^Chỉ số điện cuối kỳ/}).inputValue()==='400','Electricity not applied');
 check(await dialog.getByRole('spinbutton',{name:/^Chỉ số nước cuối kỳ/}).inputValue()==='25','Water not applied');
 check(commands.length===0,'AI sent invoice command before explicit save');
 await p.screenshot({path:outputPath(`utility-ai-${width}.png`),fullPage:true});
 await dialog.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await dialog.waitFor({state:'hidden'});check(commands.length===1,'Utility draft not saved');
 }else if(customer){
 await p.goto(new URL('/my/invoices/91',baseURL).href);await p.getByRole('heading',{name:mode==='CUSTOMER_RENT'?'Hóa đơn tiền thuê · A.102':'Hóa đơn điện nước và dịch vụ · A.102',exact:true}).waitFor();
 check(await p.getByRole('cell',{name:'Tiền thuê',exact:true}).count()===(mode==='CUSTOMER_RENT'?1:0),'Wrong rent charge rows');check(await p.getByRole('cell',{name:/^Điện/}).count()===(mode==='CUSTOMER_RENT'?0:1),'Wrong meter rows');
 }else if(mode==='SETTINGS'){
 await p.goto(new URL('/app?tab=settings&propertyId=11',baseURL).href);const select=p.getByRole('combobox',{name:/^Hóa đơn tiền thuê/});await select.waitFor();await select.selectOption('SEND');await p.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await p.getByRole('status').filter({hasText:'Đã lưu cài đặt'}).waitFor();check(settingsSaved,'Settings not saved');
 }else{
 await p.goto(new URL('/app?tab=rental_requests&propertyId=11',baseURL).href);await p.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');await p.getByRole('button',{name:'Tạo hợp đồng',exact:true}).click();const dialog=p.getByRole('dialog');for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();const select=dialog.getByRole('combobox',{name:'Chu kỳ đóng tiền thuê',exact:true});await select.waitFor();check((await select.locator('option').allTextContents()).join(',')==='1 tháng / lần,3 tháng / lần,6 tháng / lần,12 tháng / lần','Missing monthly cycle');await select.selectOption('12');await select.selectOption('1');
 }
 check(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Horizontal overflow');check(!errors.length&&!unexpected.length,JSON.stringify({errors,unexpected}));await p.screenshot({path:outputPath(`separate-billing-${mode}-${width}.png`),fullPage:true});results.push({width,mode,passed:true});
 }catch(e){throw Error(mode+' '+width+' '+p.url()+' '+JSON.stringify({errors,unexpected})+' '+(await p.locator('body').innerText()).slice(0,1800)+' '+e.message);}finally{await context.close();}
}return results;
}

test('AI requires room and readings before utility draft',async({page,baseURL},info)=>{await separateBilling(page,baseURL,name=>info.outputPath(name));});

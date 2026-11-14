import {test} from '@playwright/test';

async function separateBilling(page,baseURL,outputPath){
const results=[];const check=(v,m)=>{if(!v)throw Error(m);};
for(const width of [1440,390])for(const mode of ['OWNER','OWNER_EARLY','CUSTOMER_RENT','CUSTOMER_UTILITY','SETTINGS','WIZARD']){
 const context=await page.context().browser().newContext({viewport:{width,height:1000}});const p=await context.newPage();p.setDefaultTimeout(15000);
 const customer=mode.startsWith('CUSTOMER');const errors=[],unexpected=[],commands=[];let saved=null,settingsSaved=false;
 const user={id:customer?'2':'1',email:'party@example.invalid',fullName:customer?'Khách thuê':'Chủ nhà',roles:customer?['CUSTOMER']:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 const base={id:'91',contractId:'42',apartmentId:'21',customerId:'2',roomNumber:'A.102',apartmentTitle:'Phòng A.102',tenantName:'Khách thuê',period:'2026-11',dueDate:'2026-11-05',monthlyRent:'30000000',coverageStart:'2026-11-01',coverageEnd:'2027-04-30',rentMonths:6,rentUnitPrice:'5000000',electricityStartReading:'300',electricityEndReading:'400',electricityQuantity:'100',electricityUnitPrice:'3500',electricityAmount:'350000',waterStartReading:'20',waterEndReading:'25',waterQuantity:'5',waterUnitPrice:'15000',waterAmount:'75000',internetFee:'0',garbageFee:'0',totalAmount:'30000000',status:'SENT',createdAt:'2026-11-01T00:00:00Z',version:0,billingVersion:0,kind:'RENT'};
 const invoice=mode==='CUSTOMER_UTILITY'?{...base,kind:'UTILITY',monthlyRent:'0',totalAmount:'425000',rentMonths:0}:base;
 const meter={contractId:'42',apartmentId:'21',roomNumber:'A.102',tenantName:'Khách thuê',period:'2026-11',monthlyRent:'5000000',electricityStartReading:'300',electricityUnitPrice:'3500',waterStartReading:'20',waterUnitPrice:'15000',baselineVersion:0,waterBillingMode:'METERED',internetFee:'0',garbageFee:'0'};
 const snapshot={owner:{id:'1',fullName:'Chủ nhà',email:'owner@example.invalid'},customer:{id:'2',fullName:'Khách thuê',email:'customer@example.invalid'},asset:{apartmentId:'21',propertyId:'11',propertyName:'Tòa A',roomNumber:'A.102',title:'Phòng A.102',address:'28 Đường số 2',areaM2:'30',amenities:[],approvalStatus:'APPROVED'},receivingAccount:null};
 try{
 p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 // React StrictMode cancels the first payment-status effect; intentional aborts are expected.
 p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url()+' '+r.failure()?.errorText);});
 p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await p.route('**/api/**',async r=>{
 const path=new URL(r.request().url()).pathname;const json=body=>r.fulfill({json:body});const body=()=>r.request().postDataJSON();
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
 if(path.endsWith('/42/rent-billing-context'))return json({contractId:'42',cycleMonths:6,coverageStart:'2026-11-01',coverageEnd:'2027-04-30',months:6,monthlyRent:'5000000',totalAmount:'30000000',dueDate:'2026-11-05',billingVersion:0,existingDraftId:null,hasPartialDays:true,automationMode:'SEND',sendAvailableFrom:'2026-10-29',canSend:mode!=='OWNER_EARLY'});
 if(path.endsWith('/42/rent-invoices')){commands.push(body());check(Object.keys(body()).sort().join(',')==='billingVersion,coverageStart,dueDate','Rent sends utility fields or caller money');saved={...base,status:'SENT',electricityAmount:'0',waterAmount:'0'};return json(saved);}
 if(path.endsWith('/42/invoices')){commands.push(body());check(body().electricityEndReading==='400'&&body().waterEndReading==='25','Utility readings missing');saved={...base,id:'92',kind:'UTILITY',monthlyRent:'0',totalAmount:'425000',status:'DRAFT'};return json(saved);}
 if(path.endsWith('/91/send'))throw Error('Rent must send atomically, no second send request');
 if(path.endsWith('/92/send')){saved={...saved,status:'SENT'};return json(saved);}
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
 if(mode==='OWNER'||mode==='OWNER_EARLY'){
 await p.goto(new URL('/app?tab=invoices',baseURL).href);await p.locator('#btn-create-invoice-page').click();let dialog=p.getByRole('dialog',{name:'Lập hóa đơn',exact:true});await dialog.getByLabel('Loại hóa đơn',{exact:true}).selectOption('RENT');await dialog.getByText('Chu kỳ đã ký: 6 tháng / lần',{exact:true}).waitFor();check(await dialog.getByRole('spinbutton',{name:/^Chỉ số điện cuối kỳ/}).count()===0,'Meter entry shown for rent');check(await dialog.getByRole('button',{name:'Lưu bản nháp',exact:true}).count()===0,'Rent draft preparation still shown');
 if(mode==='OWNER_EARLY'){check(await dialog.getByRole('button',{name:'Lập và gửi',exact:true}).isDisabled(),'Early rent can send');await dialog.getByText(/Chưa đến thời gian gửi/).waitFor();check(commands.length===0,'Early rent wrote data');await dialog.getByRole('button',{name:'Đóng',exact:true}).click();}
 else{await dialog.getByRole('button',{name:'Lập và gửi',exact:true}).click();await dialog.waitFor({state:'hidden'});check(commands.length===1,'Rent did not save');}

 await p.locator('#btn-create-invoice-page').click();dialog=p.getByRole('dialog',{name:'Lập hóa đơn',exact:true});await dialog.getByRole('spinbutton',{name:/^Chỉ số điện cuối kỳ/}).fill('400');await dialog.getByRole('spinbutton',{name:/^Chỉ số nước cuối kỳ/}).fill('25');await dialog.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await dialog.waitFor({state:'hidden'});check(commands.length===(mode==='OWNER_EARLY'?1:2),'Utility did not save');
 }else if(customer){
 await p.goto(new URL('/my/invoices/91',baseURL).href);await p.getByRole('heading',{name:mode==='CUSTOMER_RENT'?'Hóa đơn tiền thuê · A.102':'Hóa đơn điện nước và dịch vụ · A.102',exact:true}).waitFor();
 check(await p.getByRole('cell',{name:'Tiền thuê',exact:true}).count()===(mode==='CUSTOMER_RENT'?1:0),'Wrong rent charge rows');check(await p.getByRole('cell',{name:/^Điện/}).count()===(mode==='CUSTOMER_RENT'?0:1),'Wrong meter rows');
 }else if(mode==='SETTINGS'){
 await p.goto(new URL('/app?tab=settings&propertyId=11',baseURL).href);await p.getByRole('heading',{name:'Hóa đơn tiền thuê tự động',exact:true}).waitFor();check(await p.getByRole('combobox',{name:/^Hóa đơn tiền thuê/}).count()===0,'Automation still requires mode selection');await p.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await p.getByRole('status').filter({hasText:'Đã lưu cài đặt'}).waitFor();check(settingsSaved,'Settings not saved');
 }else{
 await p.goto(new URL('/app?tab=rental_requests&propertyId=11',baseURL).href);await p.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');await p.getByRole('button',{name:'Tạo hợp đồng',exact:true}).click();const dialog=p.getByRole('dialog');for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();const select=dialog.getByRole('combobox',{name:'Chu kỳ đóng tiền thuê',exact:true});await select.waitFor();check((await select.locator('option').allTextContents()).join(',')==='1 tháng / lần,3 tháng / lần,6 tháng / lần,12 tháng / lần','Missing monthly cycle');await select.selectOption('12');await select.selectOption('1');
 }
 check(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Horizontal overflow');check(!errors.length&&!unexpected.length,JSON.stringify({errors,unexpected}));await p.screenshot({path:outputPath(`separate-billing-${mode}-${width}.png`),fullPage:true});results.push({width,mode,passed:true});
 }catch(e){throw Error(mode+' '+width+' '+p.url()+' '+JSON.stringify({errors,unexpected})+' '+(await p.locator('body').innerText()).slice(0,1800)+' '+e.message);}finally{await context.close();}
}return results;
}

test('Separate rent and utility billing, contract cycles and automation on desktop/mobile',async({page,baseURL},info)=>{test.setTimeout(180000);await separateBilling(page,baseURL,name=>info.outputPath(name));});

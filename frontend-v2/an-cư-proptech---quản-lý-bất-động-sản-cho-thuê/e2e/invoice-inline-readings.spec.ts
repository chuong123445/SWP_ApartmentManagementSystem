import { test, expect } from '@playwright/test';

for(const width of [1440,390])for(const scenario of ['metered','per-person','saved-edit','send-retry'])test(`Inline invoice ${scenario} ${width}`,async({page})=>{
 const errors:string[]=[],unexpected:string[]=[],consoleErrors:string[]=[];let creates=0,sends=0,saves=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&!e.text().includes('status of 503'))consoleErrors.push(e.text());});
 const perPerson=scenario==='per-person',saved=scenario==='saved-edit';
 const context:any={contractId:'42',apartmentId:'21',roomNumber:'A.102',tenantName:'Khách kiểm thử',period:'2026-11',monthlyRent:'6000000',electricityStartReading:perPerson?'0':'300',waterStartReading:'20',electricityUnitPrice:saved?'4000':'3500',waterUnitPrice:perPerson?'50000':'15000',waterBillingMode:perPerson?'PER_PERSON':'METERED',occupantCount:2,baselineVersion:0,internetFee:'0',garbageFee:'0',savedReading:saved?{electricityEndReading:'450',waterEndReading:'25',propertyRates:true,savedAt:'2026-11-01T00:00:00Z'}:null};
 const user={id:'1',email:'owner@example.invalid',fullName:'Chủ nhà kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,json=(body:unknown)=>route.fulfill({json:body});
  if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
  if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'fixture'});
  if(path.endsWith('/vneid-config'))return json({enabled:false});
  if(path==='/api/v1/me')return json(user);
  if(path.endsWith('/me/notifications'))return json({items:[],totalPages:0,totalElements:0,unreadCount:0});
  if(path.endsWith('/owner/financial-summary'))return json({});
  if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-09',expiringThrough:'2026-12-09',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
  if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
  if(path.endsWith('/owner/tenancies'))return json([{id:'42',apartmentId:'21',roomNumber:'A.102',apartmentTitle:'Phòng kiểm thử',propertyName:'Tài sản kiểm thử',customerId:'2',customerName:'Khách kiểm thử',customerEmail:'tenant@example.invalid',status:'ACTIVE',startDate:'2026-11-06',endDate:'2027-11-06',monthlyRent:'6000000',version:0}]);
  if(path.endsWith('/42/billing-context'))return json(context);
  if(path.endsWith('/42/meter-readings')){saves++;const body=req.postDataJSON();expect(body.keepSavedTariff).toBe(true);expect(body.baselineVersion).toBe(0);context.baselineVersion=1;context.savedReading={...context.savedReading,electricityEndReading:body.electricityEndReading,waterEndReading:body.waterEndReading};return json(context);}
  if(path.endsWith('/42/invoices')){
   creates++;const body=req.postDataJSON();expect(body.baselineVersion).toBe(saved?1:0);expect(body.useSavedReadings).toBe(saved);
   if(!saved){expect(body.electricityEndReading).toBe('410.25');expect(body.waterEndReading).toBe(perPerson?'20':'25.50');}
   return json({id:'91',contractId:'42',apartmentId:'21',customerId:'2',roomNumber:'A.102',tenantName:'Khách kiểm thử',period:'2026-11',dueDate:body.dueDate,monthlyRent:'6000000',electricityStartReading:context.electricityStartReading,electricityEndReading:'410.25',electricityQuantity:'110.25',electricityUnitPrice:context.electricityUnitPrice,electricityAmount:'385875',waterStartReading:'20',waterEndReading:'25.50',waterQuantity:perPerson?'2':'5.50',waterUnitPrice:context.waterUnitPrice,waterAmount:perPerson?'100000':'82500',waterBillingMode:context.waterBillingMode,occupantCount:2,totalAmount:'6500000',status:'DRAFT',createdAt:'2026-11-04T00:00:00Z',version:0});
  }
  if(path.endsWith('/91/send')){sends++;return route.fulfill({status:503,json:{message:'Chưa gửi được, thử lại.'}});}
  if(path.endsWith('/owner/invoices')||path.endsWith('/owner/invoices/additional'))return json({items:[],totalPages:0,totalElements:0,page:0});
  if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tài sản kiểm thử',ownerId:'1',roomNumber:'A.102',title:'Phòng kiểm thử',areaM2:'20',advertisedMonthlyRent:'6000000',deposit:'10000000',electricityIndex:300,waterIndex:20,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
  if(path.endsWith('/owner/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0,page:0});
  unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
 });
 await page.setViewportSize({width,height:950});await page.goto('/app?tab=invoices');await page.locator('#btn-create-invoice-page').click();
 const modal=page.getByRole('dialog',{name:'Lập hóa đơn',exact:true});await expect(modal).toBeVisible();
 await expect(modal.getByLabel('Điện đầu kỳ (kWh)',{exact:true})).toHaveValue(perPerson?'0':'300');
 const electric=modal.getByRole('spinbutton',{name:/^Chỉ số điện cuối kỳ/});
 if(saved)await expect(electric).toHaveValue('450');
 if(!saved){await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();expect(creates).toBe(0);await electric.fill(perPerson?'-1':'299');await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();expect(creates).toBe(0);}
 await electric.fill(saved?'451.25':'410.25');
 if(perPerson){await expect(modal.getByRole('spinbutton',{name:/^Chỉ số nước cuối kỳ/})).toHaveCount(0);await expect(modal).toContainText('2 người');}
 else await modal.getByRole('spinbutton',{name:/^Chỉ số nước cuối kỳ/}).fill('25.50');
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 if(scenario==='metered')await page.screenshot({path:`F:/2026/Fa26/DTD/tmp/inline-invoice-${width}.png`,fullPage:true});
 if(scenario==='send-retry'){
  await modal.getByRole('button',{name:'Lập và gửi',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('Chưa gửi được');
  await modal.getByRole('button',{name:'Gửi lại',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('Chưa gửi được');expect(creates).toBe(1);expect(sends).toBe(2);
 }else{await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(modal).toHaveCount(0);expect(creates).toBe(1);expect(saves).toBe(saved?1:0);}
 expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(consoleErrors).toEqual([]);
});

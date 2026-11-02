import {test,expect} from '@playwright/test';

for(const mobile of [false,true])test('Chốt đơn giá, chỉ số và lập hóa đơn không nhập lại '+(mobile?'mobile':'desktop'),async({page},info)=>{
  if(mobile)await page.setViewportSize({width:390,height:844});
  const tariff={electricityUnitPrice:'4000',waterUnitPrice:'50000',waterBillingMode:'PER_PERSON',internetFee:'100000',garbageFee:'30000',version:4};
  let context:any={contractId:'42',apartmentId:'21',roomNumber:'A.101',tenantName:'Khách thuê kiểm thử',period:'2026-10',monthlyRent:'5000000',electricityStartReading:'1000',waterStartReading:'200',electricityUnitPrice:'3500',waterUnitPrice:'15000',waterBillingMode:'METERED',internetFee:'0',garbageFee:'0',occupantCount:2,baselineVersion:0,savedReading:null,propertyTariff:tariff,contractTariff:{...tariff,electricityUnitPrice:'3500',waterUnitPrice:'15000',waterBillingMode:'METERED',internetFee:'0',garbageFee:'0'}};
  const saves:any[]=[];const creates:any[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
    if(path.endsWith('/refresh'))return json({accessToken:'test',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'owner@example.invalid',fullName:'Chủ nhà thử nghiệm',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
    if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa A',address:'Địa chỉ thử',approvalStatus:'APPROVED',rentalMode:'MULTI_UNIT'}]);
    if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa A',ownerId:'1',roomNumber:'A.101',title:'Phòng thử',areaM2:'20',advertisedMonthlyRent:'5000000',electricityIndex:1000,waterIndex:200,publicationStatus:'PUBLISHED',availability:'OCCUPIED',amenities:[],version:0}]);
    if(path.endsWith('/owner/tenancies'))return json([{id:'42',apartmentId:'21',roomNumber:'A.101',propertyName:'Tòa A',customerName:'Khách thuê kiểm thử',customerId:'2',status:'ACTIVE',startDate:'2026-10-01',endDate:'2027-09-30',monthlyRent:'5000000'}]);
    if(path.endsWith('/billing-context'))return json(context);
    if(path.endsWith('/meter-readings')){const input=req.postDataJSON();saves.push(input);expect(input.baselineVersion).toBe(context.baselineVersion);context={...context,...(input.applyPropertyRates?tariff:{}),baselineVersion:context.baselineVersion+1,savedReading:{electricityEndReading:input.electricityEndReading,waterEndReading:input.waterEndReading,propertyRates:input.applyPropertyRates,savedAt:'2026-11-02T09:00:00Z'}};return json(context);}
    if(path.endsWith('/contracts/42/invoices')){const input=req.postDataJSON();creates.push(input);return route.fulfill({status:201,json:{id:'91',...context,...context.savedReading,electricityQuantity:'120',waterQuantity:'2',electricityAmount:'480000',waterAmount:'100000',totalAmount:'5710000',status:'DRAFT',version:0,dueDate:input.dueDate,createdAt:'2026-11-02T09:00:00Z'}});}
    if(path.endsWith('/owner/invoices')||path.endsWith('/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0});
    if(path.endsWith('/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    return json([]);
  });
  await page.goto('/app');
  const openUtilities=async()=>{if(mobile)await page.getByRole('button',{name:'Menu quản lý',exact:true}).click();await page.locator('#nav-utilities').click();};
  await openUtilities();const card=page.getByRole('article',{name:'Chốt chỉ số A.101'});
  await expect(card.getByText('Kỳ 2026-10')).toBeVisible();
  await expect(card.getByRole('button',{name:'Lập hóa đơn từ chỉ số đã chốt'})).toBeDisabled();
  await card.getByRole('combobox',{name:'Nguồn đơn giá'}).selectOption('PROPERTY');
  await expect(card.getByText('Nước theo người: không cần nhập chỉ số đồng hồ.')).toBeVisible();
  await card.getByRole('spinbutton',{name:'Chỉ số điện mới',exact:true}).fill('1120');
  await card.getByRole('button',{name:'Lưu & chốt chỉ số'}).click();
  await expect(card.getByRole('status')).toContainText('Đã chốt và lưu');
  expect(saves[0]).toMatchObject({period:'2026-10',electricityEndReading:'1120',waterEndReading:'200',applyPropertyRates:true,settingsVersion:4});
  await page.reload();await openUtilities();await expect(card.getByRole('spinbutton',{name:'Chỉ số điện mới',exact:true})).toHaveValue('1120');
  await card.getByRole('button',{name:'Lập hóa đơn từ chỉ số đã chốt'}).click();
  const dialog=page.getByRole('dialog',{name:'Lập hóa đơn'});await expect(dialog.getByText('Đã tự lấy chỉ số và đơn giá đã chốt. Không cần nhập lại.')).toBeVisible();
  await expect(dialog.getByRole('spinbutton')).toHaveCount(0);await expect(dialog.getByText('Chỉ số điện cuối kỳ',{exact:true})).toHaveCount(0);await expect(dialog.getByText('Chỉ số nước cuối kỳ',{exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath('hoa-don-tu-chi-so.png'),fullPage:true});
  await dialog.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(dialog).toHaveCount(0);
  expect(creates).toHaveLength(1);expect(creates[0]).toMatchObject({period:'2026-10',baselineVersion:1,useSavedReadings:true});expect(creates[0].electricityEndReading).toBeUndefined();expect(creates[0].waterEndReading).toBeUndefined();expect(errors).toEqual([]);
});

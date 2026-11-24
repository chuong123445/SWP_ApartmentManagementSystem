import {test,expect} from '@playwright/test';

for(const width of [1440,390]) test('Phí sửa chữa chia sẻ tự vào hóa đơn tháng '+width,async({page},info)=>{
  await page.setViewportSize({width,height:980});
  let owner=true;
  let readyBody:any;
  let invoiceBody:any;
  const charge={ticketId:'71',title:'Sửa điều hòa',period:'2026-11',actualCost:'600000',ownerCost:'400000',customerCost:'200000'};
  let ticket:any={id:'71',propertyId:'11',apartmentId:'21',roomNumber:'A.102',reporterName:'Khách thuê',title:'Sửa điều hòa',description:'Máy lạnh không mát',category:'AIRCON',priority:'NORMAL',status:'IN_PROGRESS',createdAt:'2026-11-01T09:00:00Z',version:0,canConfirm:true,history:[],images:[]};
  const meter={contractId:'42',apartmentId:'21',roomNumber:'A.102',tenantName:'Khách thuê',period:'2026-11',monthlyRent:'5000000',electricityStartReading:'300',waterStartReading:'20',electricityUnitPrice:'3500',waterUnitPrice:'15000',waterBillingMode:'METERED',internetFee:'0',garbageFee:'0',baselineVersion:1,savedReading:{electricityEndReading:'400',waterEndReading:'25',propertyRates:false,savedAt:'2026-11-02T09:00:00Z'},maintenanceCharges:[charge],maintenanceAmount:'200000'};
  const invoice={...meter,id:'91',contractId:'42',tenantName:'Khách thuê',apartmentTitle:'Phòng A.102',customerId:'2',kind:'UTILITY',monthlyRent:'0',electricityEndReading:'400',electricityQuantity:'100',electricityAmount:'350000',waterEndReading:'25',waterQuantity:'5',waterAmount:'75000',totalAmount:'625000',status:'SENT',version:0,createdAt:'2026-11-02T09:00:00Z',dueDate:'2026-11-28'};
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const request=route.request();const path=new URL(request.url()).pathname;
    const json=(body:unknown)=>route.fulfill({json:body});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user:{id:owner?'1':'2',fullName:owner?'Chủ nhà':'Khách thuê',email:'test@example.invalid',roles:owner?['OWNER']:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED'}});
    if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/notifications'))return json({items:[],totalElements:0,totalPages:0,unreadCount:0});
    if(path.endsWith('/financial-summary'))return json({});
    if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa A',approvalStatus:'APPROVED',rentalMode:'MULTI_UNIT'}]);
    if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',roomNumber:'A.102',title:'Phòng A.102',areaM2:'30',advertisedMonthlyRent:'5000000',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',amenities:[]}]);
    if(path.endsWith('/tenancies'))return json([{id:'42',apartmentId:'21',roomNumber:'A.102',propertyName:'Tòa A',customerName:'Khách thuê',customerId:'2',status:'ACTIVE',startDate:'2026-11-01',endDate:'2027-10-31',monthlyRent:'5000000'}]);
    if(path.endsWith('/maintenance-tickets'))return json({items:[ticket],totalElements:1,totalPages:1});
    if(path.endsWith('/maintenance-tickets/71/actions')){
      const body=request.postDataJSON();
      if(body.action==='READY'){readyBody=body;ticket={...ticket,status:'AWAITING_CONFIRMATION',actualCost:body.actualCost,customerCost:body.customerCost,costResponsibility:body.costResponsibility,billingPeriod:body.billingPeriod,repairResult:body.note,version:1};}
      if(body.action==='CONFIRM')ticket={...ticket,status:'RESOLVED',version:2};
      return json(ticket);
    }
    if(path.endsWith('/billing-context'))return json(meter);
    if(path.endsWith('/contracts/42/invoices')){invoiceBody=request.postDataJSON();return route.fulfill({status:201,json:{...invoice,status:'DRAFT'}});}
    if(path==='/api/v1/invoices/91')return json(invoice);
    if(path==='/api/v1/invoices/91/payment')return json({status:'PLATFORM_UNAVAILABLE',amount:'625000'});
    if(path.endsWith('/invoices')||path.endsWith('/invoices/additional'))return json({items:[],totalElements:0,totalPages:0});
    return json([]);
  });
  await page.goto('/app?tab=maintenance');
  const card=page.getByRole('article').filter({hasText:'Sửa điều hòa'});
  await card.getByRole('button',{name:'Báo sửa xong',exact:true}).click();
  await card.getByLabel('Chi phí thực tế (đ)').fill('600000');
  await card.getByLabel('Bên chịu phí').selectOption('SHARED');
  await card.getByLabel('Phần khách chịu (đ)').fill('200000');
  await card.getByLabel('Tháng thu phí sửa chữa').fill('2026-11');
  await expect(card).toContainText('Chủ nhà chịu: 400.000 đ');
  await card.getByLabel('Kết quả sửa chữa').fill('Đã thay linh kiện, chạy thử ổn định');
  await card.getByRole('button',{name:'Xác nhận',exact:true}).click();
  await expect.poll(()=>readyBody?.billingPeriod).toBe('2026-11');
  owner=false;await page.goto('/my/maintenance');await page.reload();
  const customerCard=page.getByRole('article').filter({hasText:'Sửa điều hòa'});
  await customerCard.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).click();
  await customerCard.getByRole('checkbox').check();
  await expect(customerCard).toContainText('đồng ý trả 200.000 đ');
  await customerCard.getByRole('button',{name:'Xác nhận',exact:true}).click();
  await expect(customerCard).toContainText('Chờ thu vào hóa đơn kỳ 2026-11');
  owner=true;await page.goto('/app?tab=invoices');await page.reload();
  await page.locator('#btn-create-invoice-page').click();
  const modal=page.getByRole('dialog',{name:'Lập hóa đơn',exact:true});
  await expect(modal.getByRole('region',{name:'Chi phí sửa chữa trong hóa đơn'})).toContainText('Khách trả 200.000 đ');
  await expect(modal).toContainText('Tổng dự kiến: 625.000 đ');
  await page.screenshot({path:info.outputPath('phi-sua-chua-trong-hoa-don.png'),fullPage:true});
  await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
  await expect.poll(()=>invoiceBody?.useSavedReadings).toBe(true);
  expect(invoiceBody.maintenanceAmount).toBeUndefined();
  owner=false;await page.goto('/my/invoices/91');await page.reload();
  await expect(page.getByRole('cell',{name:'Sửa chữa: Sửa điều hòa'})).toBeVisible();
  await expect(page.getByText('Tổng: 625.000 đ',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

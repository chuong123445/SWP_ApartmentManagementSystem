import {test,expect} from '@playwright/test';
test('Lưu đơn giá thật, giữ giá 0 và tải lại đúng tài sản',async({page},info)=>{
 let saved={propertyId:'11',propertyName:'Tòa kiểm thử',configured:false,version:0,electricityUnitPrice:null as string|null,waterUnitPrice:null as string|null,internetFee:null as string|null,garbageFee:null as string|null,updatedAt:null,receivingAccount:null};
 const invoice=(..._args:unknown[])=>({});
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
      if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'owner@example.invalid',fullName:'Chủ nhà kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
      if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
      if(path.endsWith('/vneid-config'))return json({enabled:false});
      if(path.endsWith('/payment-qr'))return json({mode:'SHARED',version:0,sharedQr:null,privateQr:null});
      if(path.endsWith('/payment-qr/current'))return route.fulfill({status:204});
      if(path.endsWith('/settings')){if(route.request().method()==='PUT'){const input=route.request().postDataJSON();saved={...saved,...input,configured:true,version:saved.version+1};}return json(saved);}
      if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa kiểm thử',address:'Địa chỉ thử',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'}]);
      if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa kiểm thử',ownerId:'1',roomNumber:'T.102',title:'Phòng kiểm thử',areaM2:'20',advertisedMonthlyRent:'6000000',deposit:'10000000',electricityIndex:0,waterIndex:0,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
      if(path.endsWith('/owner/tenancies'))return json([]);
      if(path.endsWith('/owner/invoices'))return json({items:[invoice('91','SENT'),invoice('92','DRAFT')],totalPages:1,totalElements:2,page:0});
      if(path.endsWith('/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0,page:0});
      return route.fulfill({status:404,json:{message:'Unexpected test request '+path}});
    });

 await page.goto('/app');await page.locator('#nav-settings').click();
 await expect(page.getByText('Chọn một tài sản ở thanh bên để xem và sửa cài đặt.')).toBeVisible();
 await page.locator('#select-building-sidebar').selectOption('11');
 const region=page.getByRole('region',{name:'Cài đặt đơn giá tài sản'});
 await region.getByLabel('Giá điện (đ/kWh)').fill('0');await region.getByLabel('Giá nước (đ/m³)').fill('25000');await region.getByLabel('Internet (đ/phòng/tháng)').fill('100000');await region.getByLabel('Vệ sinh và rác (đ/phòng/tháng)').fill('0');
 await region.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(region.getByRole('status')).toContainText('Đã lưu cài đặt');
 await page.reload();await page.locator('#nav-settings').click();await page.locator('#select-building-sidebar').selectOption('11');
 await expect(region.getByLabel('Giá điện (đ/kWh)')).toHaveValue('0');await expect(region.getByLabel('Internet (đ/phòng/tháng)')).toHaveValue('100000');
 await expect(page.getByText('Khôi Phục Dữ Liệu Demo Gốc')).toHaveCount(0);
 await region.getByLabel('Cách tính tiền nước').selectOption('PER_PERSON');await region.getByLabel('Giá nước (đ/người/tháng)').fill('50000');await region.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(region.getByRole('status')).toContainText('Đã lưu cài đặt');
 await region.getByRole('button',{name:'Tải lại',exact:true}).click();await expect(region.getByLabel('Cách tính tiền nước')).toHaveValue('PER_PERSON');await expect(region.getByLabel('Giá nước (đ/người/tháng)')).toHaveValue('50000');
 await page.screenshot({path:info.outputPath('cai-dat-don-gia.png'),fullPage:true});
});
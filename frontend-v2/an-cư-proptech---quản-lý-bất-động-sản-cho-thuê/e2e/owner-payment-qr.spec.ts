import {test,expect} from '@playwright/test';
test('Quét QR điền bên trái, chờ xác nhận và giữ QR sau tải lại',async({page},info)=>{
 let activeQr:Record<string,unknown>|null=null;let privateQr:Record<string,unknown>|null=null;let scopeMode='SHARED';let scopeVersion=0;
 const scanned={id:'77',bank:'MBBank',bankBin:'970422',accountNumber:'00123456789',accountHolderName:'NGUYEN VAN TEST',aiStatus:'AI_SUGGESTED',confirmed:false,version:0,createdAt:'2026-10-31T00:00:00Z'};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1kAAAAASUVORK5CYII=','base64');
 let saved={propertyId:'11',propertyName:'Tòa kiểm thử',version:0,configured:false};const invoice=(..._args:unknown[])=>({});
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
      if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'owner@example.invalid',fullName:'Chủ nhà kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
      if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
      if(path.endsWith('/vneid-config'))return json({enabled:false});
      if(path.endsWith('/payment-qr/current'))return activeQr?json(activeQr):route.fulfill({status:204});
      if(path.endsWith('/payment-qr/scan'))return json(route.request().postDataBuffer()?.includes(Buffer.from('name="propertyId"'))?{...scanned,id:'78',accountNumber:'222222',propertyId:'11',selectionVersion:scopeVersion}:scanned);
      if(path.endsWith('/properties/11/payment-qr')){if(route.request().method()==='PUT'){scopeMode=route.request().postDataJSON().mode;scopeVersion++;}return json({mode:scopeMode,version:scopeVersion,sharedQr:activeQr,privateQr});}
      if(path.endsWith('/properties/22/payment-qr'))return json({mode:'SHARED',version:0,sharedQr:activeQr,privateQr:null});
      if(path.endsWith('/payment-qr/78/confirm')){scopeMode='PRIVATE';scopeVersion++;privateQr={...scanned,id:'78',propertyId:'11',selectionVersion:scopeVersion,accountNumber:'222222',confirmed:true,version:1};return json(privateQr);}
      if(path.endsWith('/payment-qr/78/image'))return route.fulfill({contentType:'image/png',body:png});
      if(path.endsWith('/payment-qr/77/confirm')){activeQr={...scanned,confirmed:true,version:1,accountHolderName:route.request().postDataJSON().accountHolderName};return json(activeQr);}
      if(path.endsWith('/payment-qr/77/image'))return route.fulfill({contentType:'image/png',body:png});
      if(path.endsWith('/settings')){if(route.request().method()==='PUT'){const input=route.request().postDataJSON();saved={...saved,...input,configured:true,version:saved.version+1};}return json(saved);}
      if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa kiểm thử',address:'Địa chỉ thử',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'},{id:'22',name:'Tòa thứ hai',address:'Địa chỉ thử 2',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'}]);
      if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa kiểm thử',ownerId:'1',roomNumber:'T.102',title:'Phòng kiểm thử',areaM2:'20',advertisedMonthlyRent:'6000000',deposit:'10000000',electricityIndex:0,waterIndex:0,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
      if(path.endsWith('/owner/tenancies'))return json([]);
      if(path.endsWith('/owner/invoices'))return json({items:[invoice('91','SENT'),invoice('92','DRAFT')],totalPages:1,totalElements:2,page:0});
      if(path.endsWith('/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0,page:0});
      return route.fulfill({status:404,json:{message:'Unexpected test request '+path}});
    });


 await page.goto('/app');await page.locator('#nav-settings').click();
 const panel=page.getByRole('region',{name:'QR nhận tiền của chủ nhà'});
 const chooserPromise=page.waitForEvent('filechooser');await panel.getByRole('button',{name:'Tải QR và điền thông tin'}).click();const chooser=await chooserPromise;await chooser.setFiles({name:'qr.png',mimeType:'image/png',buffer:png});
 await expect(panel.getByRole('img',{name:'Ảnh QR vừa chọn'})).toBeVisible();
 await expect(panel.getByLabel('Ngân hàng nhận tiền')).toHaveValue('MBBank');await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('00123456789');await expect(panel.getByLabel('Tên chủ tài khoản nhận tiền')).toHaveValue('NGUYEN VAN TEST');
 expect(activeQr).toBeNull();await expect(panel.getByRole('button',{name:'Xác nhận và lưu QR'})).toBeDisabled();
 await panel.getByRole('checkbox',{name:/Tôi đã kiểm tra/}).check();await panel.getByRole('button',{name:'Xác nhận và lưu QR'}).click();
 await expect(panel.getByRole('status',{name:'Kết quả thao tác QR'})).toContainText('Đã lưu QR');
 await page.reload();await page.locator('#nav-settings').click();await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('00123456789');await expect(panel.getByRole('img',{name:'QR nhận tiền của chủ nhà'})).toBeVisible();
 await page.locator('#select-building-sidebar').selectOption('11');await panel.getByLabel('Phạm vi QR nhận tiền').selectOption('PRIVATE');await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('');
 const ownChooserPromise=page.waitForEvent('filechooser');await panel.getByRole('button',{name:'Tải QR và điền thông tin'}).click();await (await ownChooserPromise).setFiles({name:'own.png',mimeType:'image/png',buffer:png});await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('222222');await panel.getByRole('checkbox',{name:/Tôi đã kiểm tra/}).check();await panel.getByRole('button',{name:'Xác nhận và lưu QR'}).click();await expect(panel.getByRole('status',{name:'Kết quả thao tác QR'})).toContainText('Đã lưu và áp dụng QR riêng');
 await page.locator('#select-building-sidebar').selectOption('22');await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('00123456789');
 await page.locator('#select-building-sidebar').selectOption('11');await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('222222');await panel.getByLabel('Phạm vi QR nhận tiền').selectOption('SHARED');await panel.getByRole('button',{name:'Áp dụng lựa chọn cho tài sản'}).click();await expect(panel.getByRole('status',{name:'Kết quả thao tác QR'})).toContainText('Tài sản đã chuyển sang QR chung');await expect(panel.getByLabel('Số tài khoản nhận tiền')).toHaveValue('00123456789');
 await page.setViewportSize({width:390,height:844});expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('qr-chu-nha-mobile.png'),fullPage:true});
});
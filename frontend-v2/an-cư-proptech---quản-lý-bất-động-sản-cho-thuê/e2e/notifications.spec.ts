import {test,expect} from '@playwright/test';
for(const mobile of [false,true])test('Thông báo thật: đọc, điều hướng, tải lại và lỗi trên '+(mobile?'điện thoại':'máy tính'),async({page},info)=>{
 let read=new Set<string>();let fail=false;const invoice=(..._args:unknown[])=>({});
 const items=[{id:'request-new:1',title:'Có yêu cầu thuê mới',message:'Yêu cầu thuê phòng kiểm thử',url:'/app?tab=rental_requests&propertyId=11',createdAt:'2026-10-30T10:00:00Z'},{id:'maintenance:2',title:'Cập nhật sự cố và bảo trì',message:'Sự cố kiểm thử đã được tiếp nhận',url:'/app?tab=maintenance&propertyId=11',createdAt:'2026-10-30T09:00:00Z'}];
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
      if(path.includes('/me/notifications')){
        if(path.endsWith('/read-all')){expect(route.request().postDataJSON().through).toBe('2026-10-31T00:00:00Z');read=new Set(items.map(i=>i.id));return route.fulfill({status:204});}
        if(path.endsWith('/read')){read.add(decodeURIComponent(path.split('/').at(-2)!));return route.fulfill({status:204});}
        if(fail)return route.fulfill({status:503,json:{message:'Không tải được thông báo kiểm thử.'}});
        return json({items:items.map(i=>({...i,read:read.has(i.id)})),page:0,size:20,totalElements:items.length,totalPages:1,unreadCount:items.filter(i=>!read.has(i.id)).length,snapshotAt:'2026-10-31T00:00:00Z'});
      }
      if(path.endsWith('/owner/rental-requests'))return json({items:[],page:0,totalElements:0,totalPages:0});
      if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'owner@example.invalid',fullName:'Chủ nhà kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
      if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
      if(path.endsWith('/vneid-config'))return json({enabled:false});
      if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa kiểm thử',address:'Địa chỉ thử',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'}]);
      if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa kiểm thử',ownerId:'1',roomNumber:'T.102',title:'Phòng kiểm thử',areaM2:'20',advertisedMonthlyRent:'6000000',deposit:'10000000',electricityIndex:0,waterIndex:0,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
      if(path.endsWith('/owner/tenancies'))return json([]);
      if(path.endsWith('/owner/invoices'))return json({items:[invoice('91','SENT'),invoice('92','DRAFT')],totalPages:1,totalElements:2,page:0});
      if(path.endsWith('/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0,page:0});
      return route.fulfill({status:404,json:{message:'Unexpected test request '+path}});
    });

 await page.goto('/app');if(mobile)await page.setViewportSize({width:390,height:844});
 await expect(page.locator('#btn-header-quick-invoice')).toHaveCount(0);await expect(page.getByRole('banner').getByText('Thu Tiền Phòng',{exact:true})).toHaveCount(0);await expect(page.getByRole('banner').getByText('Ghi Điện Nước',{exact:true})).toHaveCount(0);await expect(page.getByText('Hệ thống: Trực tuyến')).toHaveCount(0);await expect(page.getByText('v3.8-PRO')).toHaveCount(0);
 await page.getByRole('button',{name:'Thông báo, 2 chưa đọc',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Thông báo của bạn'});await expect(dialog.getByText('Có yêu cầu thuê mới',{exact:true})).toBeVisible();
 const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual((await page.viewportSize())!.width);
 await dialog.getByRole('button',{name:/Có yêu cầu thuê mới/}).click();await expect(page).toHaveURL(/tab=rental_requests/);await expect(page.locator('#select-building-sidebar')).toHaveValue('11');await page.getByRole('button',{name:'Thông báo, 1 chưa đọc',exact:true}).click();await dialog.getByRole('button',{name:'Đánh dấu tất cả đã đọc'}).click();await expect(dialog.getByText('0 chưa đọc',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Thông báo',exact:true}).click();await expect(dialog.getByText('0 chưa đọc',{exact:true})).toBeVisible();
 fail=true;await dialog.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Không tải được thông báo kiểm thử.');await expect(dialog.getByText(/Escrow/)).toHaveCount(0);
 await page.screenshot({path:info.outputPath('thong-bao-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true});
});
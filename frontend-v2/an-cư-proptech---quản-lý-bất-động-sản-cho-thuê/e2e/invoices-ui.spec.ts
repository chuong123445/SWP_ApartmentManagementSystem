import { test, expect } from '@playwright/test';

for (const mobile of [false,true]) {
  test(`Hóa đơn hiển thị rõ, lọc được và không tràn ngang trên ${mobile?'điện thoại':'máy tính'}`,async({page},info)=>{
    const invoice=(id:string,status:string)=>({id,contractId:'42',apartmentId:'21',customerId:'2',roomNumber:'T.102',apartmentTitle:'Phòng kiểm thử',tenantName:'Khách thuê Hai',period:'2026-10',dueDate:'2026-10-28',monthlyRent:'6000000',electricityStartReading:'0',electricityEndReading:'100',electricityQuantity:'100',electricityUnitPrice:'3500',electricityAmount:'350000',waterStartReading:'0',waterEndReading:'10',waterQuantity:'10',waterUnitPrice:'15000',waterAmount:'150000',totalAmount:'6500000',status,version:0,createdAt:'2026-10-01T00:00:00Z'});
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
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
    await page.goto('/app');await page.locator('#nav-invoices').click();if(mobile)await page.setViewportSize({width:390,height:844});
    const panel=page.getByRole('region',{name:'Quản lý hóa đơn'});await expect(panel.getByRole('heading',{name:'Hóa đơn người thuê'})).toBeVisible();
    await expect(panel.locator('[data-invoice-id]')).toHaveCount(2);
    await panel.getByRole('button',{name:/Đã gửi/}).click();await expect(panel.locator('[data-invoice-id]')).toHaveCount(1);
    await expect(panel.locator('[data-invoice-id="91"]')).toContainText('6.500.000 đ');
    await panel.getByRole('textbox',{name:'Tìm hóa đơn'}).fill('không tồn tại');await expect(panel.getByText('Chưa có hóa đơn phù hợp.')).toBeVisible();
    await panel.getByRole('textbox',{name:'Tìm hóa đơn'}).fill('');
    expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(mobile?'hoa-don-mobile.png':'hoa-don-desktop.png'),fullPage:true});
  });
}

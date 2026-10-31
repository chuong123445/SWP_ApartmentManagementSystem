import {test,expect,type Page} from '@playwright/test';

async function fixture(page:Page,hasLease=true,withBank=true){
  const leases=[{id:'42',apartmentId:'21',roomNumber:'101',apartmentTitle:'Phòng phía sân',propertyName:'Tòa A',customerId:'2',status:'ACTIVE',startDate:'2026-01-01',endDate:'2027-01-01',monthlyRent:'4500000'},{id:'43',apartmentId:'22',roomNumber:'101',apartmentTitle:'Studio ban công',propertyName:'Tòa B',customerId:'2',status:'ACTIVE',startDate:'2026-01-01',endDate:'2027-01-01',monthlyRent:'6500000'}];
  const invoice=(id:string,apartmentId:string,period:string)=>({id,apartmentId,contractId:apartmentId==='21'?'42':'43',roomNumber:'101',tenantName:'Cư dân thử nghiệm',period,dueDate:'2026-11-05',monthlyRent:'6000000',electricityStartReading:'0',electricityEndReading:'100',electricityQuantity:'100',electricityUnitPrice:'3500',electricityAmount:'350000',waterStartReading:'0',waterEndReading:'10',waterQuantity:'10',waterUnitPrice:'15000',waterAmount:'150000',totalAmount:'6500000',status:'SENT',version:0});
  const invoices=[invoice('81','21','2026-09'),invoice('82','22','2026-11'),invoice('83','21','2026-10')];
  const issues:any[]=[{id:'91',apartmentId:'21',title:'Vòi nước Tòa A',description:'Rỉ nước',category:'WATER',priority:'NORMAL',status:'PENDING',createdAt:'2026-10-30T01:00:00Z',version:0,images:[],history:[],reporterName:'Cư dân thử nghiệm',roomNumber:'101'},{id:'92',apartmentId:'22',title:'Ổ điện Tòa B',description:'Mất điện',category:'ELECTRIC',priority:'HIGH',status:'PENDING',createdAt:'2026-10-30T01:00:00Z',version:0,images:[],history:[],reporterName:'Cư dân thử nghiệm',roomNumber:'101'}];
  const created:any[]=[];
  await page.route('**/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());const path=url.pathname;const json=(body:unknown)=>route.fulfill({json:body});
    if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:'2',fullName:'Cư dân thử nghiệm',email:'resident@example.invalid',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
    if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/me/tenancies'))return json(hasLease?leases:leases.map(c=>({...c,status:'ENDED'})));
    if(path.endsWith('/me/invoices'))return json({items:url.searchParams.get('page')==='0'?invoices.slice(0,2):invoices.slice(2),totalPages:2,totalElements:3});
    if(path.endsWith('/me/maintenance-tickets')){
      if(request.method()==='POST'){
        const input=request.postDataJSON();created.push(input);const ticket={...issues[1],...input,id:'93'};issues.push(ticket);return route.fulfill({status:201,json:ticket});
      }
      return json({items:issues,totalPages:1,totalElements:issues.length});
    }
    if(path.endsWith('/invoices/82/payment'))return json({status:'NOT_CONFIGURED'});
    if(path.endsWith('/invoices/82'))return json(invoices[1]);
    if(path.endsWith('/contracts/43'))return json({id:'43',paymentMethod:'Chuyển khoản',snapshot:{receivingAccount:withBank?{bank:'Ngân hàng kiểm thử',accountNumber:'00022222',accountHolderName:'Chủ nhà Tòa B'}:null}});
    return route.fulfill({status:404,json:{message:'Unexpected test request '+path}});
  });
  return {created};
}
test('Menu gọn và từng phòng nối đúng sự cố, hóa đơn, tài khoản nhận tiền',async({page},info)=>{
  const state=await fixture(page);await page.goto('/my/home');
  await page.getByRole('button',{name:'Vai trò và tài khoản'}).click();const menu=page.getByRole('navigation',{name:'Điều hướng tài khoản'});
  for(const name of ['Nhà đang thuê','Yêu cầu & hợp đồng','Hồ sơ & tài khoản'])await expect(menu.getByRole('link',{name,exact:true})).toBeVisible();
  await expect(menu.getByRole('link',{name:'Sự cố của tôi',exact:true})).toHaveCount(0);await expect(menu.getByRole('link',{name:'Hóa đơn của tôi',exact:true})).toHaveCount(1);
  await expect(menu.getByRole('link',{name:'Hồ sơ quyền cho thuê'})).not.toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Hóa đơn & thanh toán',exact:true}).click();await expect(page.locator('.resident-invoice')).toHaveCount(2);
  await page.getByRole('combobox',{name:'Chọn nơi ở'}).selectOption('22');await expect(page.locator('.resident-invoice')).toHaveCount(1);await expect(page.locator('.resident-invoice')).toContainText('2026-11');
  await page.getByRole('button',{name:'Sự cố & sửa chữa',exact:true}).click();await expect(page.getByRole('article').filter({hasText:'Ổ điện Tòa B'})).toBeVisible();await expect(page.getByRole('article').filter({hasText:'Vòi nước Tòa A'})).toHaveCount(0);
  await page.getByRole('button',{name:'Tổng quan',exact:true}).click();await page.getByRole('button',{name:/^Báo sự cố/}).click();
  const form=page.getByRole('form',{name:'Báo sự cố mới'});await expect(form).toHaveCount(1);await form.getByLabel('Tiêu đề').fill('Khóa cửa hỏng');await form.getByLabel('Mô tả').fill('Không khóa được cửa');await form.getByRole('button',{name:'Gửi sự cố',exact:true}).click();
  await expect.poll(()=>state.created.length).toBe(1);expect(state.created[0].apartmentId).toBe('22');expect(state.created[0].customerId).toBeUndefined();await expect(page.getByRole('article').filter({hasText:'Khóa cửa hỏng'})).toBeVisible();
  await page.getByRole('button',{name:'Hợp đồng',exact:true}).click();await expect(page.getByRole('link',{name:/Xem PDF/})).toHaveAttribute('href','/contracts/43');
  await page.getByRole('button',{name:'Hóa đơn & thanh toán',exact:true}).click();await page.locator('.resident-invoice').click();await expect(page.getByRole('region',{name:'Thông tin thanh toán'})).toContainText('00022222');await expect(page.getByText('Chủ nhà Tòa B',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'← Hóa đơn của phòng'}).click();await expect(page.getByRole('combobox',{name:'Chọn nơi ở'})).toHaveValue('22');
  await page.getByRole('button',{name:'Tổng quan',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('nha-dang-thue.png'),fullPage:true});
});
test('Cư dân sử dụng được trên điện thoại và chỉ mở một biểu mẫu báo sự cố',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await fixture(page);await page.goto('/my/home?room=21');await expect(page.getByRole('combobox',{name:'Chọn nơi ở'})).toBeVisible();
  await page.getByRole('button',{name:/^Báo sự cố/}).click();await expect(page.getByRole('form',{name:'Báo sự cố mới'})).toHaveCount(1);
  expect(await page.locator('.resident-hub').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('bao-su-co-tu-phong-mobile.png'),fullPage:true});
});
test('Hợp đồng đã kết thúc không tạo phòng đang thuê giả',async({page})=>{
  await fixture(page,false);await page.goto('/my/home');await expect(page.getByText('Bạn chưa có nhà đang thuê.')).toBeVisible();await expect(page.getByRole('combobox',{name:'Chọn nơi ở'})).toHaveCount(0);await expect(page.getByRole('link',{name:'Yêu cầu & hợp đồng',exact:true})).toBeVisible();
});
test('Không dựng tài khoản thanh toán hoặc nút trả tiền giả khi hợp đồng chưa có thông tin',async({page})=>{
  await fixture(page,true,false);await page.goto('/my/invoices/82?from=home');await expect(page.getByText(/Hợp đồng chưa lưu tài khoản chuyển khoản/)).toBeVisible();await expect(page.getByText('00022222',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/Xác nhận đã thanh toán/})).toHaveCount(0);
});

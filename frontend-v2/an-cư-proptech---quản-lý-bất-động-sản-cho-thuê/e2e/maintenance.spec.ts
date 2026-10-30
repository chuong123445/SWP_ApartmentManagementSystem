import {test,expect,type Page} from '@playwright/test';

async function setup(page:Page,owner:boolean){
 let ticket:any={id:'91',propertyId:'11',apartmentId:'21',roomNumber:'A.101',reporterName:'Khách kiểm thử',title:'Vòi nước bị rò',description:'Nước rỉ liên tục',category:'WATER',priority:'HIGH',status:'PENDING',createdAt:'2026-10-30T01:00:00Z',version:0,canConfirm:true,history:[],images:[]};
 let exists=owner;
 await page.route('**/api/**',async route=>{
  const request=route.request();const path=new URL(request.url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
  if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:owner?'1':'2',email:'test@example.invalid',fullName:owner?'Chủ nhà kiểm thử':'Khách kiểm thử',roles:[owner?'OWNER':'CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
  if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
  if(path.endsWith('/vneid-config'))return json({enabled:false});
  if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa kiểm thử',address:'Địa chỉ thử',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'}]);
  if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa kiểm thử',ownerId:'1',roomNumber:'A.101',title:'Phòng thử',areaM2:'20',advertisedMonthlyRent:'1000000',deposit:'1000000',electricityIndex:10,waterIndex:10,amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);
  if(path.endsWith('/me/tenancies'))return json([{id:'42',apartmentId:'21',propertyName:'Tòa kiểm thử',roomNumber:'A.101',status:'ACTIVE',startDate:'2026-01-01',endDate:'2027-01-01'}]);
  if(path.endsWith('/owner/tenancies'))return json([]);
  if(path.endsWith('/owner/invoices'))return json({items:[],totalPages:0,totalElements:0,page:0});
  if(path.endsWith('/maintenance-tickets')){
   if(request.method()==='POST'){const input=request.postDataJSON();expect(input.apartmentId).toBe('21');expect(input.reporterId).toBeUndefined();ticket={...ticket,...input};exists=true;return route.fulfill({status:201,json:ticket});}
   return json({items:exists?[ticket]:[],totalPages:exists?1:0,totalElements:exists?1:0,page:0});
  }
  if(path.endsWith('/91/actions')){
   const input=request.postDataJSON();expect(input.version).toBe(ticket.version);ticket.version++;
   const states:Record<string,string>={ACCEPT:'ACCEPTED',ASSIGN:'IN_PROGRESS',READY:'AWAITING_CONFIRMATION',REOPEN:'IN_PROGRESS',CONFIRM:'RESOLVED'};
   ticket.status=states[input.action];
   if(input.action==='ASSIGN')Object.assign(ticket,{technicianName:input.technicianName,technicianPhone:input.technicianPhone,scheduledAt:input.scheduledAt});
   if(input.action==='READY')Object.assign(ticket,{repairResult:input.note,actualCost:input.actualCost,customerCost:'0',costResponsibility:input.costResponsibility});
   return json(ticket);
  }
  return route.fulfill({status:404,json:{message:'Unexpected test route '+path}});
 });
 return {ready(){ticket.status='AWAITING_CONFIRMATION';ticket.repairResult='Đã thay gioăng';ticket.actualCost='150000';ticket.customerCost='0';ticket.costResponsibility='OWNER';ticket.version++;}};
}
test('Chủ nhà tiếp nhận, giao thợ và gửi kết quả cho khách nghiệm thu',async({page},info)=>{
 await setup(page,true);await page.goto('/app');await page.locator('#nav-maintenance').click();
 const card=page.getByRole('article').filter({hasText:'Vòi nước bị rò'});await expect(card).toBeVisible();
 await card.getByRole('button',{name:'Tiếp nhận',exact:true}).click();await card.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await card.getByRole('button',{name:'Phân công thợ',exact:true}).click();await card.getByLabel('Tên thợ').fill('Thợ kiểm thử');await card.getByLabel('Điện thoại thợ').fill('0900000000');await card.getByLabel('Lịch hẹn').fill('2026-11-01T09:00');await card.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await card.getByRole('button',{name:'Báo sửa xong',exact:true}).click();await card.getByLabel('Kết quả sửa chữa').fill('Đã thay gioăng');await card.getByLabel('Chi phí thực tế (đ)').fill('150000');await card.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await expect(card).toContainText('Chờ khách thuê kiểm tra và xác nhận kết quả.');await expect(card.getByRole('button',{name:'Xác nhận hoàn tất',exact:true})).toHaveCount(0);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('chu-nha-cho-nghiem-thu.png'),fullPage:true});
});
test('Khách báo sự cố, yêu cầu sửa lại và xác nhận hoàn tất trên điện thoại',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page,false);await page.goto('/my/maintenance');
 await expect(page.getByText('Chưa có sự cố nào được ghi nhận.')).toBeVisible();await page.getByRole('button',{name:'Báo sự cố mới',exact:true}).click();
 const form=page.getByRole('form',{name:'Báo sự cố mới'});await form.getByLabel('Tiêu đề').fill('Vòi nước bị rò');await form.getByLabel('Mô tả').fill('Nước rỉ liên tục');await form.getByRole('button',{name:'Gửi sự cố',exact:true}).click();
 const card=page.getByRole('article').filter({hasText:'Vòi nước bị rò'});await expect(card).toBeVisible();state.ready();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await card.getByRole('button',{name:'Yêu cầu sửa lại',exact:true}).click();await card.getByLabel('Ghi chú / lý do').fill('Vẫn còn rỉ nước');await card.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(card.getByText('Đang sửa',{exact:true})).toBeVisible();
 state.ready();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await card.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).click();await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(card.getByText('Đã hoàn tất',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('khach-nghiem-thu-hoan-tat.png'),fullPage:true});
});

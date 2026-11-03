import { test, expect } from '@playwright/test';
for(const width of [1440,390])for(const legacy of [false,true])test(`Contract party details ${legacy?'legacy':'complete'} at ${width}px`,async({page})=>{
  const errors:string[]=[],unexpected:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
  page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')unexpected.push(r.url());});
  const user={id:'3',fullName:'Chủ nhà kiểm thử',email:'owner@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const customer={id:'2',fullName:'TRẦN THỊ THU HÀ',email:'tranthithuha@example.com',phone:legacy?null:'+84999000002',dateOfBirth:'1992-09-21',address:'54 Hoàng Diệu, Hải Châu, Đà Nẵng',emailVerified:false,
    documentNumber:'999000000004',documentIssueDate:legacy?null:'2021-06-16',documentIssuePlace:legacy?null:'Cục Cảnh sát quản lý hành chính về trật tự xã hội',permanentAddress:legacy?null:'54 Hoàng Diệu, phường Phước Ninh, quận Hải Châu, thành phố Đà Nẵng',identityVerificationStatus:'VERIFIED',localFixture:false};
  const owner={...customer,id:'3',fullName:'Chủ nhà kiểm thử',email:user.email,emailVerified:true};
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url()),path=url.pathname,json=(body:unknown)=>route.fulfill({json:body});
    if(route.request().method()!=='GET'&&!path.endsWith('/csrf')&&!path.endsWith('/refresh')){unexpected.push('Unexpected write '+path);return route.fulfill({status:400});}
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/owner/properties'))return json([{id:'4',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
    if(path.endsWith('/owner/rental-requests')){const items=url.searchParams.get('status')==='ACCEPTED'?[{id:'31',apartmentId:'5',apartmentTitle:'Căn hộ kiểm thử',advertisedMonthlyRent:'8500000',customerId:'2',customerName:customer.fullName,customerEmail:customer.email,status:'ACCEPTED',createdAt:'2026-11-03T00:00:00Z',version:0,contractCompleted:false}]:[];return json({items,page:0,totalElements:items.length,totalPages:items.length?1:0});}
    if(path.endsWith('/contract-context'))return json({rentalRequestId:'31',requestVersion:0,sourceVersion:'a'.repeat(64),snapshot:{owner,customer,asset:{apartmentId:'5',propertyId:'4',propertyName:'Tài sản kiểm thử',title:'Căn hộ kiểm thử',roomNumber:'A.01',address:'Đà Nẵng',amenities:[],areaM2:'45'},receivingAccount:null},advertisedMonthlyRent:'8500000',suggestedDeposit:'8500000',templateClauses:Array.from({length:5},(_,i)=>({title:`Điều khoản ${i+1}`,body:'Thỏa thuận thuê nhà'})),existingDraft:null});
    if(path.endsWith('/owner/invoices'))return json({items:[],page:0,totalElements:0,totalPages:0});
    if(['/api/v1/owner/apartments','/api/v1/owner/tenancies','/api/v1/me/tenancies','/api/v1/owner/maintenance-tickets'].includes(path))return json([]);
    unexpected.push(path);return route.fulfill({status:404});
  });
  await page.setViewportSize({width,height:950});await page.goto('/app?tab=rental_requests&propertyId=4');
  await page.getByLabel('Trạng thái',{exact:true}).selectOption('CONTRACTING');await page.getByRole('button',{name:'Tạo hợp đồng',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Tạo hợp đồng thuê',exact:true});await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Thông tin bên cho thuê (Bên A)',exact:true})).toBeVisible();
  await expect(dialog.getByText('Xác thực email',{exact:true})).toHaveCount(0);await expect(dialog.getByText('Đã xác thực email',{exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Tiếp theo →',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Thông tin bên thuê (Bên B)',exact:true})).toBeVisible();
  await expect(dialog.getByText(customer.fullName,{exact:true})).toBeVisible();await expect(dialog.getByText(customer.documentNumber,{exact:true})).toBeVisible();
  await expect(dialog.getByText('Xác thực email',{exact:true})).toHaveCount(0);await expect(dialog.getByText('Chưa xác thực email',{exact:true})).toHaveCount(0);
  if(legacy)await expect(dialog.getByText('Chưa có dữ liệu',{exact:true})).toHaveCount(4);
  else{for(const value of [customer.phone,customer.documentIssueDate,customer.documentIssuePlace,customer.permanentAddress])await expect(dialog.getByText(value!,{exact:true})).toBeVisible();await expect(dialog.getByText('Chưa có dữ liệu',{exact:true})).toHaveCount(0);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(consoleErrors).toEqual([]);
});

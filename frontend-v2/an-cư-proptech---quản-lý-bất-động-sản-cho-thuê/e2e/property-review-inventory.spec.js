import {test} from '@playwright/test';

async function exerciseReview(page, outputPath, origin) {
 const results=[];
 for(const width of [1440,390]){
  const ctx=await page.context().browser().newContext({viewport:{width,height:950}});const p=await ctx.newPage();const errors=[],unexpected=[];let created=null;
  const user={id:'1',fullName:'Owner kiểm thử',email:'review@example.invalid',roles:['CUSTOMER','OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const property=(id,status)=>({id,name:'Tài sản '+id,address:'12 Đường Kiểm Thử',city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:'Linh Trung',rentalMode:'MULTI_UNIT',approvalStatus:status,version:0,rightType:'OWNERSHIP'});
  const props=[property('1','APPROVED'),property('2','REJECTED'),property('3','PENDING_APPROVAL')];
  const unit=(id,pid,title)=>({id,propertyId:pid,propertyName:'Tài sản '+pid,ownerId:'1',roomNumber:title,title,description:'',floor:1,areaM2:'28',advertisedMonthlyRent:'5000000',deposit:null,electricityIndex:null,waterIndex:null,maxOccupants:2,amenities:[],publicationStatus:'DRAFT',availability:'VACANT',propertyApprovalStatus:props.find(x=>x.id===pid).approvalStatus,thumbnail:'/fixture-room.svg',version:0});
  const units=[unit('11','1','Phòng riêng đã duyệt'),unit('22','2','Phòng bị từ chối'),unit('33','3','Phòng chờ duyệt')];
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
   await p.route('**/fixture-room.svg',r=>r.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#059669"/></svg>',contentType:'image/svg+xml'}));
   await p.route('**/api/**' ,async r=>{
    const req=r.request(),path=new URL(req.url()).pathname;const json=v=>r.fulfill({json:v});
    if(path.endsWith('/auth/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/auth/refresh'))return json({accessToken:'fixture',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/auth/vneid-config'))return json({enabled:false});
    if(path.endsWith('/me/verifications'))return json({emailVerified:true,vneid:{status:'VERIFIED'}});
    if(path==='/api/v1/me/listing-drafts')return json([]);
    if(path==='/api/v1/me/properties')return json(props.map(property=>({property,apartments:units.filter(a=>a.propertyId===property.id)})));
    if(path.endsWith('/verification-dossiers')){const id=path.split('/').at(-2);return json([{id:'d'+id,propertyId:id,rightType:'OWNERSHIP',applicantName:'Owner kiểm thử',status:props.find(x=>x.id===id).approvalStatus,submittedAt:'2026-11-01T00:00:00Z',reviewedAt:id==='3'?null:'2026-11-09T00:00:00Z',reviewReason:id==='2'?'Địa chỉ giấy tờ không khớp':id==='1'?'Đã đối chiếu giấy chứng nhận':null,files:[]}]);}
    if(path==='/api/v1/me/property-images')return json([{id:'71'}]);
    if(path==='/api/v1/owner/apartments'&&req.method()==='POST'){created=req.postDataJSON();const a=unit('44','1',created.roomNumber);units.push(a);return json(a);}
    if(path==='/api/v1/owner/apartments')return json(units);
    if(path==='/api/v1/owner/properties')return json(props);
    if(path.includes('workspace-summary'))return json({unpaidCount:0,expiringContractCount:0,expiredContractCount:0,maintenanceCount:0});
    if(path.includes('financial-summary'))return json({});
    if(path.includes('/invoices'))return json({items:[],page:0,totalPages:0,totalElements:0,size:20});
    if(path.includes('tenancies')||path.includes('maintenance')||path.includes('notification')||path.includes('/payments/'))return json([]);
    unexpected.push(path);return json([]);
   });
   await p.goto(`${origin}/account/properties`);
   await p.getByText('Địa chỉ giấy tờ không khớp',{exact:false}).waitFor();
   if(await p.getByRole('heading',{name:'Phòng bị từ chối',exact:true}).count()||await p.getByRole('heading',{name:'Phòng chờ duyệt',exact:true}).count())throw Error('Unapproved room card shown');
   await p.getByRole('heading',{name:'Phòng riêng đã duyệt',exact:true}).waitFor();
   await p.locator('[data-testid=managed-property]').first().getByRole('link',{name:'Hồ sơ và giấy tờ',exact:true}).click();
   await p.getByRole('dialog').waitFor();await p.getByRole('dialog').getByText('Đã đối chiếu giấy chứng nhận',{exact:false}).waitFor();
   if(await p.getByRole('dialog').getByText('Không tìm thấy tài sản.',{exact:true}).count())throw Error('Legacy dossier inaccessible');
   await p.getByRole('button',{name:'Đóng hồ sơ',exact:true}).click();
   await p.goto(`${origin}/account/properties`);
   await p.getByRole('button',{name:'Thêm phòng vào tài sản này',exact:true}).click();
   await p.locator('#new-apartment-title').fill('Phòng thêm');
   await p.getByText('Mã / Số phòng *',{exact:true}).locator('..').locator('input').fill('P.404');
   await p.getByLabel('Đơn giá điện (đ/kWh) *').fill('3500');await p.getByLabel('Đơn giá nước (đ/m³) *').fill('15000');
   await p.getByRole('button',{name:'Thêm Phòng',exact:true}).click();await p.getByRole('alert').filter({hasText:'Cần ít nhất một ảnh riêng'}).waitFor();
   await p.locator('input[type=file]').setInputFiles({name:'room.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
   await p.screenshot({path:outputPath(`property-add-room-${width}.png`),fullPage:true});
   await p.getByRole('button',{name:'Thêm Phòng',exact:true}).click();await p.getByRole('heading',{name:'P.404',exact:true}).waitFor();
   if(created.propertyId!=='1'||created.publicationStatus!=='DRAFT'||created.imageIds[0]!=='71'||created.electricityUnitPrice!=='3500'||created.waterUnitPrice!=='15000')throw Error('Wrong new unit payload');
   await p.goto(`${origin}/app?tab=properties`);if(width===390)await p.getByRole('button',{name:'Menu quản lý',exact:true}).click();await p.getByRole('button',{name:'Quản lý căn hộ',exact:true}).click();
   await p.getByText('Phòng riêng đã duyệt',{exact:true}).waitFor();
   if(await p.getByText('Phòng bị từ chối',{exact:true}).count()||await p.getByText('Phòng chờ duyệt',{exact:true}).count())throw Error('Unapproved room in operations');
   const options=await p.locator('select').first().locator('option').allTextContents();if(options.some(x=>x.includes('Tài sản 2')||x.includes('Tài sản 3')))throw Error('Unapproved sidebar option');
   await p.screenshot({path:outputPath(`property-operations-${width}.png`),fullPage:true});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Horizontal overflow');
   if(errors.length||unexpected.length)throw Error(JSON.stringify({errors,unexpected}));
   results.push({width,passed:true,decisionReason:true,unapprovedHidden:true,appendWithPrivatePhoto:true,operationsApprovedOnly:true});
  }finally{await ctx.close();}
 }
 return results;
}


test('review results, approved inventory and room append',async({page},info)=>{await exerciseReview(page,name=>info.outputPath(name),process.env.E2E_BASE_URL||'http://localhost:3000');});

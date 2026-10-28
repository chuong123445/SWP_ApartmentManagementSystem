import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7i8AAAAASUVORK5CYII=','base64');
async function fixture(page:Page,options:{customer?:boolean;foreign?:boolean;pending?:boolean;sourceFailure?:boolean;expired?:boolean}={}){
  let role=options.customer?'CUSTOMER':'OWNER';let consent=false;let imported=false;let sourceFailure=!!options.sourceFailure;let sourceReads=0;let edits=0;let prices=0;let galleryWrites=0;
  const errors:string[]=[],unexpected:string[]=[],logs:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')logs.push(`${m.text()} [${m.location().url}]`);});page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')unexpected.push(r.url());});
  const user=()=>({id:options.foreign?'42':'41',fullName:'TRẦN QUANG MINH',email:'fixture@example.invalid',roles:[role],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0});
  const property:any={id:'7',name:'Nhà cho thuê Nguyễn Văn Linh',address:'168 Nguyễn Văn Linh, Đà Nẵng',city:'Đà Nẵng',district:'Hải Châu',ward:null,rentalMode:'SINGLE_UNIT',approvalStatus:'APPROVED',version:0,verificationSource:null,rightType:'AUTHORIZATION',onboardingApplication:true};
  const unit:any={id:'9',propertyId:'7',ownerId:'41',propertyName:property.name,title:'Căn hộ A1205',description:'Nội dung đã lưu từ Backend.',roomNumber:'A1205',floor:12,areaM2:'68.50',advertisedMonthlyRent:'5000000',deposit:'5000000',electricityUnitPrice:'3500',waterUnitPrice:'15000',electricityIndex:120,waterIndex:30,maxOccupants:4,bedrooms:2,bathrooms:2,amenities:['Máy lạnh'],availability:'VACANT',publicationStatus:'PUBLISHED',propertyApprovalStatus:'APPROVED',thumbnail:'/api/v1/property-images/11',version:0};
  let gallery=[{id:'11',url:'/api/v1/property-images/11'}];
  const detail=()=>({...unit,address:property.address,city:property.city,district:property.district,images:gallery.map(i=>i.url),lessorRelationship:property.rightType,rentalRightsAvailable:!options.expired,publicOwner:{id:'41',displayName:'TRẦN QUANG MINH',contactVerified:false},management:options.foreign?null:{propertyId:'7',propertyVersion:property.version,approvalStatus:property.approvalStatus,verificationSource:property.verificationSource,canEdit:true,pricesEditable:!options.pending,priceLockReason:options.pending?'Cần xử lý tất cả yêu cầu thuê đang chờ trước khi đổi giá.':null,gallery,roomNumber:unit.roomNumber,maxOccupants:unit.maxOccupants}});
  await page.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;const body=()=>req.postDataJSON();
    if(path==='/api/v1/auth/vneid-config')return route.fulfill({json:{enabled:false}});
    if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'csrf',headerName:'X-XSRF-TOKEN'}});
    if(path==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:'asset-portal-test',tokenType:'Bearer',expiresIn:900,user:user()}});
    if(path==='/api/v1/me')return route.fulfill({json:user()});
    if(path==='/api/v1/me/verifications')return route.fulfill({json:{emailVerified:false,vneid:{status:'VERIFIED',verifiedAt:'2026-10-28T00:00:00Z',identity:{documentNumber:'999000000041',legalName:'TRẦN QUANG MINH',dateOfBirth:'1990-05-20',gender:'Nam',address:property.address}}}});
    if(path==='/api/v1/me/tenancies'||path==='/api/v1/owner/tenancies')return route.fulfill({json:[]});
    if(path==='/api/v1/me/property-source-consent'){
      if(req.method()==='POST'){expect(body()).toEqual({consent:true,version:0});expect(req.headers()['x-xsrf-token']).toBe('csrf');consent=true;}
      return route.fulfill({json:{consented:consent,assetServiceAvailable:true,version:0}});
    }
    if(path==='/api/v1/owner/properties/vneid-assets'){
      expect(consent).toBe(true);sourceReads++;if(sourceFailure)return route.fulfill({status:503,json:{message:'Nguồn tài sản tạm thời chưa sẵn sàng.'}});
      return route.fulfill({json:[{asset:{externalAssetId:'SOURCE-01',name:property.name,address:property.address,rentalMode:'SINGLE_UNIT',units:[{externalUnitId:'U-01',code:'A1205',areaM2:68.5,bedrooms:2,bathrooms:2}]},sourceVersion:'a'.repeat(64),imported}]});
    }
    if(path==='/api/v1/owner/properties/vneid-imports'){
      expect(consent).toBe(true);expect(role).toBe('CUSTOMER');expect(body().externalAssetId).toBe('SOURCE-01');expect(body().imageIds).toHaveLength(1);expect(body().units[0].monthlyRent).toBe('6000000');
      imported=true;role='OWNER';property.verificationSource='AUTH0_VNEID_SIMULATION';property.rightType='OWNERSHIP';return route.fulfill({status:201,json:{property,apartments:[unit]}});
    }
    if(path==='/api/v1/me/properties')return route.fulfill({json:options.customer&&!imported?[]:[{property,apartments:[unit]}]});
    if(path==='/api/v1/owner/properties')return route.fulfill({json:[property]});
    if(path==='/api/v1/owner/apartments')return route.fulfill({json:[unit]});
    if(path==='/api/v1/owner/invoices'||path==='/api/v1/owner/rental-requests')return route.fulfill({json:{items:[],page:0,totalPages:0,totalElements:0}});
    if(path==='/api/v1/owner/contract-drafts')return route.fulfill({json:[]});
    if(path==='/api/v1/apartments/9')return route.fulfill({json:detail()});
    if(path==='/api/v1/me/apartments/9/rental-requests')return route.fulfill({json:[]});
    if(path==='/api/v1/owner/apartments/9/publication'){expect(body().version).toBe(unit.version);unit.publicationStatus=body().publicationStatus;unit.version++;return route.fulfill({json:unit});}
    if(path==='/api/v1/me/apartments/9'){
      expect(options.foreign).not.toBe(true);expect(body().version).toBe(unit.version);expect(body().ownerId).toBeUndefined();Object.assign(unit,body(),{version:unit.version+1});edits++;return route.fulfill({status:204});
    }
    if(path==='/api/v1/me/apartments/9/prices'){
      expect(options.pending).not.toBe(true);expect(body().version).toBe(unit.version);unit.advertisedMonthlyRent=body().monthlyRent;unit.electricityUnitPrice=body().electricityUnitPrice;unit.waterUnitPrice=body().waterUnitPrice;unit.version++;prices++;return route.fulfill({json:unit});
    }
    if(path==='/api/v1/me/property-images'){expect(req.headers().authorization).toBe('Bearer asset-portal-test');return route.fulfill({status:201,json:[{id:'12',url:'/api/v1/property-images/12'}]});}
    if(path==='/api/v1/me/properties/7/images'){
      expect(body().version).toBe(property.version);expect(body().imageIds.length).toBeGreaterThanOrEqual(1);expect(body().imageIds.length).toBeLessThanOrEqual(4);gallery=body().imageIds.map((id:string)=>({id,url:`/api/v1/property-images/${id}`}));property.version++;galleryWrites++;return route.fulfill({status:204});
    }
    if(path.startsWith('/api/v1/property-images/')){expect(req.headers().authorization).toBe('Bearer asset-portal-test');return route.fulfill({contentType:'image/png',body:png});}
    if(path==='/api/v1/apartments/address-options')return route.fulfill({json:[]});
    if(path==='/api/v1/apartments')return route.fulfill({json:{items:[],page:0,size:6,totalPages:0,totalElements:0}});
    unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:404});
  });
  return {role:()=>role,sourceReads:()=>sourceReads,edits:()=>edits,prices:()=>prices,galleryWrites:()=>galleryWrites,retrySource:()=>{sourceFailure=false;},check:()=>{expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(logs.filter(x=>!(x.includes('404')&&x.includes('/favicon.ico]'))&&!(options.sourceFailure&&x.includes('503')))).toEqual([]);}};
}
for(const width of [1440,390])test(`Customer-layout asset list and shared owner detail edit/reload at ${width}px`,async({page})=>{
  const f=await fixture(page);await page.setViewportSize({width,height:950});await page.goto('/account/properties');await expect(page.getByRole('heading',{name:'Quản lý tài sản',exact:true})).toBeVisible();await expect(page.locator('aside')).toHaveCount(0);mkdirSync('test-results/visual',{recursive:true});await page.screenshot({path:`test-results/visual/asset-portal-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'Xem chi tiết / chỉnh sửa',exact:false}).click();await expect(page).toHaveURL(/\/apartments\/9$/);await expect(page.getByRole('heading',{name:'Căn hộ A1205',exact:true})).toBeVisible();await expect(page.getByText('Escrow MBBank',{exact:false})).toHaveCount(0);await expect(page.getByRole('button',{name:'Gửi yêu cầu thuê',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Chỉnh sửa thông tin, ảnh và giá'}).click();await page.getByLabel('Tiêu đề căn hộ',{exact:true}).fill('Căn hộ đã cập nhật');await page.getByLabel('Mô tả căn hộ',{exact:true}).fill('Mô tả cập nhật và được lưu.');await page.getByRole('button',{name:'Lưu thông tin căn hộ',exact:true}).click();await expect(page.getByRole('heading',{name:'Căn hộ đã cập nhật',exact:true})).toBeVisible();
  await page.getByLabel('Giá thuê mỗi tháng (đ)',{exact:true}).fill('6500000');await page.getByLabel('Đơn giá điện (đ/kWh)',{exact:true}).fill('4000');await page.getByRole('button',{name:'Lưu giá thuê, điện và nước',exact:true}).click();await expect(page.getByLabel('Giá thuê mỗi tháng (đ)',{exact:true})).toHaveValue('6500000');
  await page.getByLabel('Thêm ảnh tài sản',{exact:true}).setInputFiles({name:'can-ho.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Lưu thay đổi ảnh',exact:true}).click();await expect(page.getByText('Tổng ảnh sau thay đổi: 2/4')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync('test-results/visual',{recursive:true});await page.screenshot({path:`test-results/visual/asset-detail-owner-${width}.png`,fullPage:true});
  await page.reload();await expect(page.getByRole('heading',{name:'Căn hộ đã cập nhật',exact:true})).toBeVisible();expect(f.edits()).toBe(1);expect(f.prices()).toBe(1);expect(f.galleryWrites()).toBe(1);f.check();
});
test('Owner permission starts only after selected source asset is completely created',async({page})=>{
  const f=await fixture(page,{customer:true});await page.goto('/account/owner-upgrade');await expect(page).toHaveURL(/\/account\/properties\/new$/);await expect(page.getByRole('heading',{name:'Chính chủ',exact:true})).toBeVisible();expect(f.sourceReads()).toBe(0);
  await page.getByRole('link',{name:/Chính chủ/}).click();await expect(page.getByText('Chính chủ — Kết nối dữ liệu tài sản')).toBeVisible();expect(f.sourceReads()).toBe(0);expect(f.role()).toBe('CUSTOMER');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Đồng ý và chọn tài sản',exact:true}).click();await page.getByRole('radio').check();expect(f.role()).toBe('CUSTOMER');
  await page.getByLabel('Thêm ảnh tài sản',{exact:true}).setInputFiles({name:'anh.png',mimeType:'image/png',buffer:png});await page.getByLabel('Tỉnh/Thành phố *',{exact:true}).fill('Đà Nẵng');await page.getByLabel('Quận/Huyện/Khu vực *',{exact:true}).fill('Hải Châu');
  for(const [label,value] of [['Giá thuê/tháng (đ) *','6000000'],['Tiền cọc (đ) *','6000000'],['Đơn giá điện (đ/kWh) *','3500'],['Đơn giá nước (đ/m³) *','15000'],['Chỉ số điện ban đầu (kWh) *','120'],['Chỉ số nước ban đầu (m³) *','30'],['Tầng *','12'],['Số người tối đa *','4']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Thêm và cho thuê',exact:true}).click();await expect(page).toHaveURL(/\/account\/properties$/);await expect(page.getByTestId('managed-property')).toHaveCount(1);expect(f.role()).toBe('OWNER');await page.getByRole('link',{name:'Thêm tài sản cho thuê',exact:true}).click();await expect(page.getByRole('heading',{name:'Người thuê lại',exact:true})).toBeVisible();f.check();
});
for(const relationship of ['authorization','sublease'])test(`Each new ${relationship} property uses manual form without reading Auth0 assets or promoting`,async({page})=>{
  const f=await fixture(page,{customer:true});await page.goto(`/account/properties/new/${relationship}`);await expect(page.getByLabel('Tên tài sản *',{exact:true})).toBeVisible();expect(f.role()).toBe('CUSTOMER');expect(f.sourceReads()).toBe(0);await expect(page.locator('aside')).toHaveCount(0);f.check();
});
test('Pending rental requests disable all three price changes',async({page})=>{
  const f=await fixture(page,{pending:true});await page.goto('/apartments/9');await page.getByRole('button',{name:'Chỉnh sửa thông tin, ảnh và giá'}).click();await expect(page.getByRole('button',{name:'Lưu giá thuê, điện và nước',exact:true})).toBeDisabled();await expect(page.getByLabel('Giá thuê mỗi tháng (đ)',{exact:true})).toBeDisabled();await expect(page.getByText('Cần xử lý tất cả yêu cầu thuê đang chờ trước khi đổi giá.')).toBeVisible();expect(f.prices()).toBe(0);f.check();
});
test('Another renter sees the same detail without owner controls',async({page})=>{
  const f=await fixture(page,{foreign:true});await page.goto('/apartments/9');await expect(page.getByRole('heading',{name:'Căn hộ A1205',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Gửi yêu cầu thuê',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Chỉnh sửa thông tin, ảnh và giá'})).toHaveCount(0);f.check();
});
test('Source outage after consent never grants Owner and offers source retry',async({page})=>{
  const f=await fixture(page,{customer:true,sourceFailure:true});await page.goto('/account/properties/new/ownership');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Đồng ý và chọn tài sản',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Nguồn tài sản tạm thời');expect(f.role()).toBe('CUSTOMER');f.retrySource();await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();await expect(page.getByRole('radio')).toBeVisible();expect(f.role()).toBe('CUSTOMER');f.check();
});
test('Operational workspace links out to asset management and has no asset CRUD tabs',async({page})=>{
  const f=await fixture(page);await page.goto('/app');await expect(page.locator('#nav-rental_requests')).toBeVisible();await expect(page.locator('#nav-properties')).toHaveCount(0);await expect(page.locator('#nav-rooms')).toHaveCount(0);await expect(page.locator('#nav-settings')).toHaveCount(0);await page.getByRole('link',{name:'Quản lý tài sản',exact:true}).click();await expect(page).toHaveURL(/\/account\/properties$/);f.check();
});

test('Owner can hide an expired listing but cannot publish it again',async({page})=>{
  const f=await fixture(page,{expired:true});await page.goto('/apartments/9');await expect(page.getByRole('button',{name:'Ẩn tin cho thuê',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Ẩn tin cho thuê',exact:true}).click();await expect(page.getByRole('button',{name:'Công khai căn hộ',exact:true})).toBeDisabled();f.check();
});

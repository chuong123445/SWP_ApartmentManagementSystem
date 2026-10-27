import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const asset = { externalAssetId: 'source-asset-1', name: 'Căn hộ nguồn VNeID', address: '12 Đường kiểm thử, Đà Nẵng', rentalMode: 'SINGLE_UNIT', units: [{ externalUnitId: 'source-unit-1', code: 'A.101', areaM2: 65.5, bedrooms: 2, bathrooms: 1 }] };
const property = { id: '22222222-2222-2222-2222-222222222222', name: asset.name, address: asset.address, city: 'Đà Nẵng', district: 'Hải Châu', ward: null, rentalMode: 'SINGLE_UNIT', approvalStatus: 'APPROVED', verificationSource: 'AUTH0_VNEID_SIMULATION', version: 1 };
async function setup(page: Page, mode: 'ok' | 'empty' | 'imported' | 'load-error' | 'stale' | 'save-error' = 'ok') {
  let loadError = mode === 'load-error', saveError = mode === 'save-error', count=0, saved=false, lists=0;
  const errors: string[]=[],badNetwork: string[]=[],logs: string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')logs.push(`${e.text()} [${e.location().url}]`);});
  page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')badNetwork.push(r.url());});
  const user={id:'11111111-1111-1111-1111-111111111111',fullName:'Người kiểm thử tài sản',email:'asset@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:5};
  const apartment={id:'33333333-3333-3333-3333-333333333333',propertyId:property.id,propertyName:property.name,roomNumber:'A.101',title:'A.101',description:'Căn hộ cho thuê',floor:2,areaM2:'65.50',advertisedMonthlyRent:'6500000.00',deposit:'6500000.00',electricityIndex:100,waterIndex:20,maxOccupants:4,bedrooms:2,bathrooms:1,amenities:[],publicationStatus:'PUBLISHED',availability:'VACANT',propertyApprovalStatus:'APPROVED',electricityUnitPrice:'3500.00',waterUnitPrice:'15000.00',version:0};
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/v1/auth/vneid-config')return route.fulfill({json:{enabled:false}});
    if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'fixture-csrf',headerName:'X-XSRF-TOKEN'}});
    if(path==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:'asset-test-token',tokenType:'Bearer',expiresIn:900,user}});
    if(path==='/api/v1/me')return route.fulfill({json:user});
    if(path==='/api/v1/me/verifications')return route.fulfill({json:{emailVerified:false,vneid:{status:'VERIFIED',identity:null,verifiedAt:null}}});
    if(path==='/api/v1/owner/properties/vneid-assets') {lists++;return loadError?route.fulfill({status:503,json:{message:'Chưa tải được nguồn tài sản.'}}):route.fulfill({json:mode==='empty'?[]:[{asset,sourceVersion:'a'.repeat(64),imported:mode==='imported'||saved}]});}
    if(path==='/api/v1/owner/properties/vneid-imports') {
      count++;expect(route.request().headers().authorization).toBe('Bearer asset-test-token');
      const body=route.request().postDataJSON();expect(body).toEqual({externalAssetId:asset.externalAssetId,sourceVersion:'a'.repeat(64),city:'Đà Nẵng',district:'Hải Châu',ward:null,units:[{externalUnitId:'source-unit-1',monthlyRent:'6500000',deposit:'6500000',electricityUnitPrice:'3500',waterUnitPrice:'15000',electricityIndex:100,waterIndex:20,floor:2,maxOccupants:4,description:''}]});
      if(mode==='stale')return route.fulfill({status:409,json:{code:'ASSET_SOURCE_CHANGED',message:'Thông tin tài sản đã thay đổi. Hãy tải lại danh sách.'}});
      if(saveError)return route.fulfill({status:503,json:{code:'ASSET_SOURCE_UNAVAILABLE',message:'Nguồn tài sản tạm lỗi.'}});
      saved=true;return route.fulfill({status:201,json:{property,apartments:[apartment]}});
    }
    if(path==='/api/v1/owner/properties')return route.fulfill({json:saved?[property]:[]});
    if(path==='/api/v1/owner/apartments')return route.fulfill({json:saved?[apartment]:[]});
    if(path==='/api/v1/owner/invoices')return route.fulfill({json:{items:[],totalPages:0,page:0,totalElements:0}});
    if(['/api/v1/owner/tenancies','/api/v1/me/tenancies'].includes(path))return route.fulfill({json:[]});
    badNetwork.push(`Unexpected API ${path}`);return route.fulfill({status:404});
  });
  return {count:()=>count,lists:()=>lists,recover:()=>{loadError=false;saveError=false;},check:()=>{
    expect(errors).toEqual([]);expect(badNetwork).toEqual([]);const expected=mode==='stale'?'409':['load-error','save-error'].includes(mode)?'503':null;
    expect(logs.filter(x=>!(x.includes('status of 404')&&x.includes('/favicon.ico]'))&&!(expected&&x.includes(`status of ${expected}`)))).toEqual([]);
  }};
}
async function open(page:Page){await page.goto('/app');await page.getByRole('button',{name:'Thêm tài sản cho thuê',exact:true}).click();await page.getByRole('button',{name:'Chọn tài sản từ VNeID',exact:true}).click();}
async function fill(page:Page){
  await page.getByRole('radio').check();const modal=page.getByRole('dialog',{name:'Chọn tài sản từ VNeID',exact:true});
  await modal.getByLabel('Tỉnh/Thành phố *',{exact:true}).fill('Đà Nẵng');await modal.getByLabel('Quận/Huyện/Khu vực *',{exact:true}).fill('Hải Châu');
  for(const [label,value] of [['Giá thuê/tháng (đ) *','6500000'],['Tiền cọc (đ) *','6500000'],['Đơn giá điện (đ/kWh) *','3500'],['Đơn giá nước (đ/m³) *','15000'],['Chỉ số điện ban đầu (kWh) *','100'],['Chỉ số nước ban đầu (m³) *','20'],['Tầng *','2'],['Số người tối đa *','4']])await modal.getByLabel(label,{exact:true}).fill(value);
  return modal;
}
for(const width of [1440,390])test(`Select source asset and publish with complete terms at ${width}px`,async({page})=>{
  const fixture=await setup(page);await page.setViewportSize({width,height:900});await open(page);const modal=await fill(page);
  await expect(modal.getByText('A.101 · 65.5 m²',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync('test-results/visual',{recursive:true});await page.screenshot({path:`test-results/visual/vneid-asset-terms-${width}.png`,fullPage:true});
  await modal.getByRole('button',{name:'Thêm và cho thuê',exact:true}).click();await expect(modal).toHaveCount(0);
  await expect(page.getByTestId('property-card').getByText('Đã xác thực qua VNeID',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Xem hồ sơ kiểm duyệt',exact:true})).toHaveCount(0);expect(fixture.count()).toBe(1);
  await page.reload();if(width===390)await page.getByRole('button',{name:'Menu quản lý',exact:true}).click();await page.locator('#nav-properties').click();await expect(page.getByTestId('property-card').getByText(asset.name,{exact:true})).toBeVisible();fixture.check();
});
test('Missing terms prevents POST and manual form is still accessible',async({page})=>{
  const fixture=await setup(page);await open(page);await page.getByRole('radio').check();await page.getByRole('button',{name:'Thêm và cho thuê',exact:true}).click();expect(fixture.count()).toBe(0);
  await page.getByRole('button',{name:'Nhập tài sản thủ công',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu tài sản nháp',exact:true})).toBeVisible();fixture.check();
});
test('Imported asset cannot be selected again',async({page})=>{const fixture=await setup(page,'imported');await open(page);await expect(page.getByRole('radio')).toBeDisabled();await expect(page.getByText('1 căn/phòng · Đã thêm vào hệ thống')).toBeVisible();expect(fixture.count()).toBe(0);fixture.check();});
test('Empty source has no invented sample asset',async({page})=>{const fixture=await setup(page,'empty');await open(page);await expect(page.getByText('Chưa có tài sản phù hợp trong VNeID để thêm vào hệ thống.')).toBeVisible();await expect(page.getByRole('radio')).toHaveCount(0);fixture.check();});
test('Source load failure supports retry',async({page})=>{const fixture=await setup(page,'load-error');await open(page);await expect(page.getByRole('alert')).toContainText('Chưa tải được nguồn');fixture.recover();await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();await expect(page.getByRole('radio')).toBeEnabled();fixture.check();});
test('Changed source blocks resubmission until list is refreshed',async({page})=>{const fixture=await setup(page,'stale');await open(page);await fill(page);const save=page.getByRole('button',{name:'Thêm và cho thuê',exact:true});await save.click();await expect(page.getByRole('alert')).toContainText('đã thay đổi');await expect(save).toBeDisabled();const before=fixture.lists();await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();await expect(page.getByRole('radio')).not.toBeChecked();expect(fixture.lists()).toBeGreaterThan(before);expect(fixture.count()).toBe(1);fixture.check();});
test('Provider save failure preserves terms for retry',async({page})=>{const fixture=await setup(page,'save-error');await open(page);await fill(page);const save=page.getByRole('button',{name:'Thêm và cho thuê',exact:true});await save.click();await expect(page.getByRole('alert')).toContainText('tạm lỗi');await expect(page.getByLabel('Giá thuê/tháng (đ) *',{exact:true})).toHaveValue('6500000');fixture.recover();await save.click();await expect(page.getByTestId('property-card')).toBeVisible();expect(fixture.count()).toBe(2);fixture.check();});

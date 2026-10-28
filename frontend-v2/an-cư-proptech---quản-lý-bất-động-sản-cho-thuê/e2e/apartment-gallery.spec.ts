import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
async function setup(page:Page,count:number,owner=false){
  let images=Array.from({length:count},(_,n)=>owner?`/api/v1/property-images/${n+1}`:`/gallery-fixture/${n+1}.svg`);let propertyVersion=0;
  const errors:string[]=[],unexpected:string[]=[],consoleErrors:string[]=[];const loaded=new Set<string>();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(`${m.text()} [${m.location().url}]`);});page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')unexpected.push(r.url());});
  const user={id:'41',fullName:'Chủ tài sản kiểm thử',email:'gallery@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const svg=(id:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${['#d1fae5','#bfdbfe','#fde68a','#fecdd3'][Number(id)-1]}"/><text x="400" y="300" text-anchor="middle" font-size="48">Photo ${id}</text></svg>`;
  await page.route('**/gallery-fixture/*',r=>{const id=new URL(r.request().url()).pathname.split('/').at(-1)!.split('.')[0];loaded.add(id);return r.fulfill({contentType:'image/svg+xml',body:svg(id)});});
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/v1/auth/vneid-config')return route.fulfill({json:{enabled:false}});
    if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'csrf',headerName:'X-XSRF-TOKEN'}});
    if(path==='/api/v1/auth/refresh')return owner?route.fulfill({json:{accessToken:'gallery-owner-token',tokenType:'Bearer',expiresIn:900,user}}):route.fulfill({status:401,json:{message:'Chưa đăng nhập'}});
    if(path==='/api/v1/me')return route.fulfill({json:user});
    if(path==='/api/v1/me/tenancies')return route.fulfill({json:[]});
    if(path==='/api/v1/apartments/9')return route.fulfill({json:{id:'9',title:'Căn hộ nhiều ảnh',description:'Thông tin căn hộ',propertyName:'Tài sản thử',address:'Đà Nẵng',city:'Đà Nẵng',district:'Hải Châu',areaM2:'68.5',advertisedMonthlyRent:'6000000',images,amenities:[],availability:'VACANT',publicationStatus:'PUBLISHED',bedrooms:2,bathrooms:2,version:0,publicOwner:{id:'41',displayName:user.fullName,contactVerified:true},management:owner?{propertyId:'7',propertyVersion,approvalStatus:'APPROVED',verificationSource:'AUTH0_VNEID_SIMULATION',canEdit:true,pricesEditable:true,priceLockReason:null,gallery:images.map(url=>({id:url.split('/').at(-1),url})),maxOccupants:4,roomNumber:'A.01'}:null}});
    if(path.startsWith('/api/v1/property-images/')){expect(route.request().headers().authorization).toBe('Bearer gallery-owner-token');expect(new URL(route.request().url()).search).toBe('');const id=path.split('/').at(-1)!;loaded.add(id);return route.fulfill({contentType:'image/svg+xml',body:svg(id)});}
    if(path==='/api/v1/me/properties/7/images'){const body=route.request().postDataJSON();expect(body.imageIds).toEqual(['1']);images=['/api/v1/property-images/1'];propertyVersion++;return route.fulfill({status:204});}
    unexpected.push(path);return route.fulfill({status:404});
  });
  return {loaded,check:()=>{expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(consoleErrors.filter(x=>!x.includes('status of 401')&&!(x.includes('status of 404')&&x.includes('/favicon.ico]')))).toEqual([]);}};
}
for(const width of [1440,390])test(`All four photos navigate both ways, wrap and support keyboard at ${width}px`,async({page})=>{
  const f=await setup(page,4);await page.setViewportSize({width,height:950});await page.goto('/apartments/9');const gallery=page.getByRole('region',{name:'Ảnh căn hộ',exact:true});
  for(let n=1;n<=4;n++){await expect(gallery.getByText(`${n} / 4`,{exact:true})).toBeVisible();await expect(gallery.getByRole('img')).toHaveAttribute('alt',`Căn hộ nhiều ảnh - ảnh ${n}`);await expect.poll(()=>gallery.getByRole('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);if(n<4)await gallery.getByRole('button',{name:'Ảnh tiếp theo',exact:true}).click();}
  await gallery.getByRole('button',{name:'Ảnh tiếp theo',exact:true}).click();await expect(gallery.getByText('1 / 4',{exact:true})).toBeVisible();await gallery.getByRole('button',{name:'Ảnh trước',exact:true}).click();await expect(gallery.getByText('4 / 4',{exact:true})).toBeVisible();
  await gallery.getByRole('button',{name:'Xem ảnh 2',exact:true}).click();await gallery.focus();await page.keyboard.press('ArrowRight');await expect(gallery.getByText('3 / 4',{exact:true})).toBeVisible();await page.keyboard.press('ArrowLeft');await expect(gallery.getByText('2 / 4',{exact:true})).toBeVisible();
  expect([...f.loaded].sort()).toEqual(['1','2','3','4']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync('test-results/visual',{recursive:true});await gallery.screenshot({path:`test-results/visual/apartment-gallery-${width}.png`});f.check();
});
for(const count of [0,1])test(`${count} photo gallery has no useless previous/next controls`,async({page})=>{
  const f=await setup(page,count);await page.goto('/apartments/9');const gallery=page.getByRole('region',{name:'Ảnh căn hộ',exact:true});await expect(gallery.getByText(count?'1 / 1':'Chưa có ảnh',{exact:true})).toBeVisible();await expect(gallery.getByRole('button')).toHaveCount(0);await expect(gallery.getByRole('img')).toBeVisible();f.check();
});
test('Private owner gallery preserves Bearer access and resets after removing photos',async({page})=>{
  const f=await setup(page,4,true);await page.goto('/apartments/9');const gallery=page.getByRole('region',{name:'Ảnh căn hộ',exact:true});await gallery.getByRole('button',{name:'Xem ảnh 4',exact:true}).click();await expect(gallery.getByRole('img')).toHaveAttribute('src',/^blob:/);
  await page.getByRole('button',{name:'Thêm / quản lý ảnh'}).click();for(const n of [4,3,2])await page.getByRole('button',{name:`Bỏ ảnh đã lưu ${n}`,exact:true}).click();await page.getByRole('button',{name:'Lưu thay đổi ảnh',exact:true}).click();await expect(gallery.getByText('1 / 1',{exact:true})).toBeVisible();await expect(gallery.getByRole('button')).toHaveCount(0);await expect(gallery.getByRole('img')).toHaveAttribute('alt','Căn hộ nhiều ảnh - ảnh 1');f.check();
});

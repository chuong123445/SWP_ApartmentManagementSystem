import {test,expect} from '@playwright/test';
import {mockGoogleIdentity} from './support/google-identity';
for(const target of ['/my/contracts/9223372036854775807','/my/invoices/9007199254740993','/account/properties/new/authorization']) {
  test(`Login preserves exact local destination ${target}`,async({page})=>{
    let loggedIn=false;let resourceReads=0;const errors:string[]=[],unexpected:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const user={id:'8',email:'redirect@example.invalid',fullName:'Người kiểm thử',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
    const session={accessToken:'redirect-internal',tokenType:'Bearer',expiresIn:900,user};
    await mockGoogleIdentity(page);
    await page.route('**/api/**',route=>{
      const path=new URL(route.request().url()).pathname;
      if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'csrf',headerName:'X-XSRF-TOKEN'}});
      if(path==='/api/v1/auth/vneid-config')return route.fulfill({json:{enabled:false}});
      if(path==='/api/v1/auth/refresh')return loggedIn?route.fulfill({json:session}):route.fulfill({status:401,json:{message:'Chưa đăng nhập'}});
      if(path==='/api/v1/auth/login'){loggedIn=true;return route.fulfill({json:session});}
      if(path==='/api/v1/me')return route.fulfill({json:user});
      if(path==='/api/v1/me/verifications')return route.fulfill({json:{emailVerified:true,vneid:{status:'UNVERIFIED',citizen:null},version:0}});
      if(path==='/api/v1/me/tenancies')return route.fulfill({json:[]});
      if(path===`/api/v1/contracts/${target.split('/').at(-1)}`||path===`/api/v1/invoices/${target.split('/').at(-1)}`){
        resourceReads++;expect(route.request().headers().authorization).toBe('Bearer redirect-internal');
        // Fixture không có hợp đồng/hóa đơn này: Backend vẫn quyết định quyền truy cập.
        return route.fulfill({status:404,json:{message:'Không tìm thấy dữ liệu của bạn.'}});
      }
      unexpected.push(path);return route.fulfill({status:404});
    });
    await page.goto(target);await expect(page).toHaveURL(/\/login$/);await page.locator('#login-email').fill(user.email);await page.locator('#login-password').fill('Fixture-password!123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await expect(page).toHaveURL(new URL(target,test.info().project.use.baseURL as string).href);
    if(target.startsWith('/my/')){await expect(page.getByRole('alert')).toContainText('Không tìm thấy dữ liệu của bạn.');expect(resourceReads).toBeGreaterThanOrEqual(1);}
    else await expect(page.getByRole('heading',{name:'Thêm tài sản cho thuê'})).toBeVisible();
    expect(errors).toEqual([]);expect(unexpected).toEqual([]);
  });
}

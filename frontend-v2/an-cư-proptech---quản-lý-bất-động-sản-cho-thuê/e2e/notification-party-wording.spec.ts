import {test,expect} from '@playwright/test';
import {ownerSummaryFixture} from './fixtures/ownerSummary';
for(const width of [1440,390])for(const owner of [false,true])test(`Party notification ${width} ${owner?'owner':'tenant'}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[],unknown:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const role=owner?'Người thuê':'Chủ nhà';const user={id:owner?'3':'2',fullName:'Tài khoản kiểm thử',email:'fixture@example.invalid',roles:owner?['OWNER','CUSTOMER']:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 const titles=[`${role} đã từ chối đề nghị kết thúc thuê sớm của bạn`,`${role} đã đồng ý đề nghị hủy làm hợp đồng của bạn`];
 await page.route('**/api/**',async route=>{if(owner){const result=ownerSummaryFixture(route);if(result)return result;}const p=new URL(route.request().url()).pathname,send=(json:unknown)=>route.fulfill({json});
  if(p.endsWith('/csrf'))return send({token:'fixture',headerName:'X-XSRF-TOKEN'});if(p.endsWith('/vneid-config'))return send({enabled:false});if(p.endsWith('/refresh'))return send({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});if(p==='/api/v1/me')return send(user);
  if(p.endsWith('/notifications'))return send({items:titles.map((title,i)=>({id:`contract-exit:${i}`,title,message:`HD-26 · HH205.RENEW — ${role} Nguyễn Văn Kiểm Thử. Lý do / nội dung: Cần tiếp tục hợp đồng theo thỏa thuận.`,url:'/contracts/26?section=termination',createdAt:'2026-11-25T00:00:00Z',read:false})),page:0,size:20,totalElements:2,totalPages:1,unreadCount:2,snapshotAt:'2026-11-25T01:00:00Z'});
  if(p.endsWith('/owner/properties'))return send([{id:'4',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
  if(p.endsWith('/tenancies')||p.endsWith('/contract-drafts')||p.endsWith('/contract-exit-requests')||p.endsWith('/owner/apartments')||p.endsWith('/owner/maintenance-tickets'))return send([]);
  if(p.includes('/conversations')||p.endsWith('/rental-requests')||p.endsWith('/owner/renewal-requests')||p.endsWith('/owner/invoices'))return send({items:[],unreadCount:0,totalElements:0,totalPages:0});
  unknown.push(p);return route.fulfill({status:404,json:{message:'Unexpected fixture call'}});
 });
 await page.goto(owner?'/app?tab=contracts&propertyId=4':'/my/contracts');await page.getByRole('button',{name:'Thông báo, 2 chưa đọc',exact:true}).click();const popup=page.getByRole('dialog',{name:'Thông báo của bạn'});
 for(const title of titles)await expect(popup.getByText(title,{exact:true})).toBeVisible();await expect(popup).toContainText('Nguyễn Văn Kiểm Thử');await expect(popup).toContainText('Lý do / nội dung:');
 const box=await popup.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);expect(await popup.evaluate(e=>e.scrollWidth>e.clientWidth+1)).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);expect(unknown).toEqual([]);await page.screenshot({path:info.outputPath('party-notifications.png')});
});

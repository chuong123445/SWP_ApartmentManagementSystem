import {test,expect} from '@playwright/test';
for(const mobile of [false,true])test('Sổ quỹ lưu thật qua API, chỉ cộng khi ghi sổ và hủy có lý do '+mobile,async({page},info)=>{
 const rows:any[]=[];const requests:any[]=[];
 await page.route('**/api/**',async route=>{const req=route.request();const url=new URL(req.url());const path=url.pathname;const json=(body:unknown)=>route.fulfill({json:body});
 if(path.endsWith('/refresh'))return json({accessToken:'test',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'owner@example.invalid',fullName:'Chủ nhà thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
 if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});if(path.endsWith('/vneid-config'))return json({enabled:false});
 if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa A',address:'Địa chỉ thử',rentalMode:'MULTI_UNIT',approvalStatus:'APPROVED'}]);
 if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tòa A',ownerId:'1',roomNumber:'A.101',title:'Phòng thử',areaM2:'20',advertisedMonthlyRent:'5000000',electricityIndex:0,waterIndex:0,amenities:[],publicationStatus:'PUBLISHED',availability:'VACANT',version:0}]);
 if(path.endsWith('/cash-entries/summary')){const posted=rows.filter(e=>e.status==='POSTED');return json({income:posted.length?'125000.50':'0',expense:'0',netCashflow:posted.length?'125000.50':'0',postedCount:posted.length});}
 if(path.endsWith('/cash-entries')){if(req.method()==='POST'){const body=req.postDataJSON();requests.push(body);rows.push({...body,id:1,code:'THU-1',propertyName:'Tòa A',status:'DRAFT',version:0,createdAt:new Date().toISOString()});return route.fulfill({status:201,json:rows[0]});}return json({items:rows,totalElements:rows.length,totalPages:rows.length?1:0,page:0,size:20});}
 if(path.endsWith('/cash-entries/1/post')){expect(req.postDataJSON().version).toBe(0);rows[0]={...rows[0],status:'POSTED',version:1,postedAt:new Date().toISOString()};return json(rows[0]);}
 if(path.endsWith('/cash-entries/1/cancel')){expect(req.postDataJSON()).toEqual({version:1,reason:'Nhập nhầm khoản thu'});rows[0]={...rows[0],status:'CANCELLED',version:2,cancellationReason:req.postDataJSON().reason,cancelledAt:new Date().toISOString()};return json(rows[0]);}
 if(path.endsWith('/owner/invoices')||path.endsWith('/maintenance-tickets'))return json({items:[],totalPages:0,totalElements:0});if(path.endsWith('/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});return json([]);
 });
 if(mobile)await page.setViewportSize({width:390,height:844});
 await page.goto('/app');const open=async()=>{if(mobile)await page.getByRole('button',{name:'Menu quản lý',exact:true}).click();await page.locator('#nav-finance').click();};await open();
 await expect(page.getByText('Chưa có phiếu trong phạm vi đang chọn.')).toBeVisible();
 await page.getByRole('button',{name:'Tạo phiếu thu / chi',exact:true}).click();const form=page.getByRole('dialog',{name:'Tạo phiếu thu chi'});
 await form.getByLabel('Tài sản',{exact:true}).selectOption('11');await form.getByLabel('Số tiền (đ)',{exact:true}).fill('125000.50');await form.getByLabel('Danh mục',{exact:true}).fill('Thu khác');await form.getByLabel('Người trả / nhận',{exact:true}).fill('Khách thử');await form.getByLabel('Nội dung',{exact:true}).fill('Khoản thu thử nghiệm');await form.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(form).toHaveCount(0);
 await expect(page.locator('[aria-label="Tổng thực thu"]')).toContainText('0 đ');expect(requests).toHaveLength(1);expect(requests[0].amount).toBe('125000.50');expect(requests[0].requestKey).toMatch(/^[0-9a-f-]{36}$/);
 await page.reload();await open();const row=page.locator('[data-cash-id="1"]');await expect(row).toContainText('Nháp');await row.getByRole('button',{name:'Ghi sổ',exact:true}).click();await page.getByRole('dialog',{name:'Xác nhận ghi sổ'}).getByRole('button',{name:'Xác nhận đã thu / chi'}).click();await expect(page.locator('[aria-label="Tổng thực thu"]')).toContainText('125.000,5 đ');
 await row.getByRole('button',{name:'Hủy phiếu',exact:true}).click();const cancel=page.getByRole('dialog',{name:'Hủy phiếu',exact:true});await cancel.getByLabel('Lý do hủy').fill('Nhập nhầm khoản thu');await cancel.getByRole('button',{name:'Xác nhận hủy phiếu'}).click();await expect(row).toContainText('Đã hủy');await expect(page.locator('[aria-label="Tổng thực thu"]')).toContainText('0 đ');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('so-quy.png'),fullPage:true});
});

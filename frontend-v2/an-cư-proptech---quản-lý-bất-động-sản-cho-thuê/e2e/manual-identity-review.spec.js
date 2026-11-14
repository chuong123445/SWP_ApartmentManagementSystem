import {test} from '@playwright/test';
import {fileURLToPath} from 'node:url';
async function manualIdentityScenario(page,width,imagePath,baseURL='http://localhost:3196'){
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};let role='CUSTOMER',profile=null,latest=null,verified=false,submits=0;const unexpected=[],errors=[];
 const fields={legalName:'Nguyễn Văn Kiểm Thử',documentNumber:'001095000123',dateOfBirth:'1995-06-15',issueDate:'2022-05-01',issuePlace:'Cục Cảnh sát',permanentAddress:'Hà Nội',currentAddress:'Đà Nẵng'};
 const user=()=>({id:role==='ADMIN'?'9':'2',fullName:role==='ADMIN'?'Admin kiểm thử':'Khách kiểm thử',email:'identity@example.invalid',roles:[role],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/api/**',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname,json=body=>route.fulfill({json:body});
  if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
  if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user:user()});
  if(path.endsWith('/vneid-config'))return json({enabled:false});
  if(path==='/api/v1/me')return json(user());
  if(path.endsWith('/me/tenancies'))return json([]);
  if(path.endsWith('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
  if(path.endsWith('/me/verifications'))return json({emailVerified:true,vneid:{status:verified?'VERIFIED':'UNVERIFIED',verifiedAt:verified?'2026-11-14T00:00:00Z':null,source:verified?'ADMIN_REVIEW':null,identity:verified?{...fields,address:fields.currentAddress,gender:'Không khai báo',documentIssueDate:fields.issueDate,documentIssuePlace:fields.issuePlace}:null}});
  if(path.endsWith('/me/identity')){if(req.method()==='GET')return profile?json(profile):route.fulfill({status:204});profile={...fields,version:(profile?.version??-1)+1,verificationStatus:'NOT_VERIFIED',localFixture:false,updatedAt:'2026-11-14T00:00:00Z'};return json(profile);}
  if(path.endsWith('/me/identity-submissions')){if(req.method()==='GET')return latest?json(latest):route.fulfill({status:204});const b=req.postDataJSON();check(b.consent===true&&b.profileVersion===profile.version,'Missing source/consent');submits++;latest={id:String(submits),accountId:'2',profile:{...profile},status:'PENDING',version:0,submittedAt:'2026-11-14T00:00:00Z',reason:null};return json(latest);}
  if(path.includes('/identity/documents/')||path.includes('/identity-submissions/')&&path.includes('/documents/'))return route.fulfill({contentType:'image/png',path:imagePath});
  if(path.endsWith('/admin/identity-submissions'))return json({items:latest&&latest.status===u.searchParams.get('status')?[latest]:[],page:0,totalPages:1,totalElements:1});
  if(path.match(/\/admin\/identity-submissions\/\d+$/))return json(latest);
  if(path.endsWith('/decision')){check(role==='ADMIN','Only admin decides');const b=req.postDataJSON();check(b.version===latest.version,'Stale decision');latest={...latest,status:b.action==='APPROVE'?'APPROVED':'REJECTED',reason:b.reason,version:1,reviewerId:'9',reviewedAt:'2026-11-14T00:00:00Z'};verified=b.action==='APPROVE';return json(latest);}
  unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
 });
 await page.setViewportSize({width,height:950});await page.goto(baseURL+'/account/settings/identity');
 const form=page.getByRole('region',{name:'Xác thực bằng hồ sơ nhập tay'});await form.getByLabel('Họ và tên trên căn cước',{exact:true}).fill(fields.legalName);
 for(const [key,label] of [['documentNumber','Số căn cước công dân'],['dateOfBirth','Ngày sinh'],['issueDate','Ngày cấp căn cước'],['issuePlace','Nơi cấp căn cước'],['permanentAddress','Địa chỉ thường trú'],['currentAddress','Địa chỉ hiện tại']])await form.getByLabel(label,{exact:true}).fill(fields[key]);
 await form.getByLabel('Ảnh căn cước mặt trước',{exact:true}).setInputFiles(imagePath);await form.getByLabel('Ảnh căn cước mặt sau',{exact:true}).setInputFiles(imagePath);
 check(await form.getByRole('button',{name:'Gửi Admin xét duyệt',exact:true}).isDisabled(),'Consent must be required');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Gửi Admin xét duyệt',exact:true}).click();await form.getByText('Đang chờ Admin duyệt',{exact:true}).waitFor({state:'visible'});
 check(submits===1,'Unexpected submissions');await page.screenshot({path:`F:/2026/Fa26/DTD/tmp/manual-identity-pending-${width}.png`});
 role='ADMIN';await page.goto(baseURL+'/admin/property-dossiers?tab=identity');await page.getByRole('button',{name:/Nguyễn Văn Kiểm Thử/}).click();const detail=page.getByRole('region',{name:'Chi tiết hồ sơ xác thực'});await detail.getByRole('button',{name:'Duyệt xác thực tài khoản',exact:true}).waitFor({state:'visible'});
 check(await detail.getByRole('button',{name:'Từ chối hồ sơ',exact:true}).isDisabled(),'Rejection reason must be required');await detail.getByLabel('Lý do / ghi chú (bắt buộc khi từ chối)').fill('Ảnh mặt sau cần chụp rõ hơn.');await detail.getByRole('button',{name:'Từ chối hồ sơ',exact:true}).click();await detail.waitFor({state:'hidden'});
 role='CUSTOMER';await page.goto(baseURL+'/account/settings/identity');await form.getByText('Hồ sơ bị từ chối — cần bổ sung',{exact:true}).waitFor({state:'visible'});await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Gửi lại hồ sơ',exact:true}).click();await form.getByText('Đang chờ Admin duyệt',{exact:true}).waitFor({state:'visible'});
 role='ADMIN';await page.goto(baseURL+'/admin/property-dossiers?tab=identity');await page.getByRole('button',{name:/Nguyễn Văn Kiểm Thử/}).click();await detail.getByRole('button',{name:'Duyệt xác thực tài khoản',exact:true}).waitFor({state:'visible'});await detail.getByRole('img',{name:'Căn cước mặt trước đã nộp',exact:true}).waitFor({state:'visible'});await page.screenshot({path:`F:/2026/Fa26/DTD/tmp/manual-identity-admin-${width}.png`});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Admin horizontal overflow');await detail.getByRole('button',{name:'Duyệt xác thực tài khoản',exact:true}).click();await detail.waitFor({state:'hidden'});
 role='CUSTOMER';await page.goto(baseURL+'/account/settings/identity');await page.getByRole('heading',{name:'Căn cước · Admin đã duyệt',exact:true}).waitFor({state:'visible'});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Customer horizontal overflow');
 check(errors.length===0,JSON.stringify(errors));check(unexpected.length===0,JSON.stringify(unexpected));return {width,submitted:submits,rejectResubmitApprove:true,errors:0};
}
for(const width of [1440,390])test(`Manual identity review ${width}px`,async({page,baseURL})=>{await manualIdentityScenario(page,width,fileURLToPath(new URL('./fixtures/manual-identity.png',import.meta.url)),baseURL);});

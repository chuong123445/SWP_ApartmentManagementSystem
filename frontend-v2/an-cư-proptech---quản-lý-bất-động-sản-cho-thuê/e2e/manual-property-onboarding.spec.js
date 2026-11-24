import {test} from '@playwright/test';

export async function exercise(page,width,source,role){
 const errors=[],bad=[],sourceCalls=[];let created=0;
 await page.setViewportSize({width,height:1000});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const user={id:'3',fullName:'Người đăng tài sản',email:'fixture@example.invalid',roles:[role],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 const draft={propertyId:'101',version:0,propertyVersion:0,rightType:'OWNERSHIP',completed:false,payload:{},files:[],acceptedFileIds:[]};
 await page.route('**/api/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,send=data=>route.fulfill({json:data});
  if(/vneid-assets|vneid-imports|vneid-units|property-source-consent/.test(p)){sourceCalls.push(p);return route.fulfill({status:410,json:{code:'PROPERTY_SOURCE_RETIRED'}});}
  if(p.endsWith('/csrf'))return send({token:'fixture',headerName:'X-XSRF-TOKEN'});
  if(p.endsWith('/vneid-config'))return send({enabled:false});
  if(p.endsWith('/refresh'))return send({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
  if(p==='/api/v1/me')return send(user);
  if(p.endsWith('/me/tenancies'))return send([]);
  if(p.endsWith('/me/verifications'))return send({emailVerified:true,vneid:{status:'VERIFIED',verifiedAt:'2026-11-24T00:00:00Z',source,identity:null}});
  if(p.endsWith('/me/listing-drafts')){if(req.method()==='POST'){const input=req.postDataJSON();if(input.rightType!=='OWNERSHIP')throw Error('Wrong right type');created++;return send(draft);}return send([]);}
  if(p.endsWith('/me/listing-drafts/101'))return send(draft);
  if(p.includes('notifications'))return send({items:[],unreadCount:0,totalElements:0,totalPages:0});
  if(p.includes('conversations'))return send({items:[],unreadCount:0,totalElements:0,totalPages:0});
  bad.push(p);return send([]);
 });
 await page.goto('http://localhost:3195/account/properties/new',{waitUntil:'networkidle'});
 await page.getByRole('link').filter({has:page.getByRole('heading',{name:'Chính chủ',exact:true})}).click();
 await page.getByRole('heading',{name:'Chính chủ — Chuẩn bị hồ sơ'}).waitFor();
 if(await page.getByText('Chọn tài sản từ VNeID',{exact:true}).count())throw Error('Source picker remains');
 await page.getByRole('button',{name:'Bắt đầu hồ sơ mới',exact:true}).click();
 await page.getByRole('heading',{name:'Giấy tờ quyền cho thuê',exact:true}).waitFor();
 if(created!==1)throw Error('Manual draft not created once');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 if(overflow||errors.length||bad.length||sourceCalls.length)throw Error(JSON.stringify({overflow,errors,bad,sourceCalls}));
 if(width===390&&role==='OWNER'&&source==='AUTH0_VNEID_SIMULATION')await page.screenshot({path:'F:/2026/Fa26/DTD/tmp/manual-property-390.png',fullPage:true});
 return {width,source,role,created,sourceCalls:0,errors:0,overflow};
}
// Registered scenarios
for(const width of [1440,390])for(const source of ['AUTH0_VNEID_SIMULATION','ADMIN_REVIEW'])for(const role of ['OWNER','CUSTOMER'])test(`Manual ownership ${width} ${source} ${role}`,async({page})=>{await exercise(page,width,source,role);});

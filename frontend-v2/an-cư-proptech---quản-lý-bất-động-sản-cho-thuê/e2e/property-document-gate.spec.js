import {test} from '@playwright/test';
import {fileURLToPath} from 'node:url';
async function documentGateScenario(page,width,scenario,imagePath,baseURL='http://localhost:3196'){
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};let current=null,serial=10,good=false;const errors=[],unexpected=[];
 const user={id:'2',fullName:'Người kiểm thử',email:'gate@example.invalid',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/status of (422|503)/.test(m.text()))errors.push(m.text());});
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,json=body=>route.fulfill({json:body});
  if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
  if(path.endsWith('/refresh'))return json({accessToken:'fixture',expiresIn:900,user});
  if(path.endsWith('/vneid-config'))return json({enabled:false});
  if(path==='/api/v1/me')return json(user);
  if(path.endsWith('/me/tenancies'))return json([]);
  if(path.endsWith('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
  if(path.endsWith('/me/verifications'))return json({emailVerified:true,vneid:{status:'VERIFIED',source:'ADMIN_REVIEW',identity:null}});
  if(path==='/api/v1/me/listing-drafts'){if(req.method()==='GET')return json([]);current={propertyId:'5',version:0,propertyVersion:0,rightType:'OWNERSHIP',completed:false,files:[],acceptedFileIds:[],payload:{}};return json(current);}
  if(path==='/api/v1/me/listing-drafts/5'){
   if(req.method()==='PUT'){const body=req.postDataJSON();check(body.version===current.version,'Stale save');if(body.payload.step>0&&current.files.filter(f=>!body.payload.excludedFiles.includes(f.id)).some(f=>!current.acceptedFileIds.includes(f.id)))return route.fulfill({status:422,json:{code:'DOCUMENT_SCAN_REQUIRED',message:'Giấy tờ chưa được quét phù hợp.'}});current={...current,version:current.version+1,payload:body.payload};}return json(current);
  }
  if(path.endsWith('/evidence-files')){const file={id:String(++serial),purpose:'RIGHT_DOCUMENT',filename:good?'ownership.png':'unrelated.png',contentType:'image/png',size:100};current.files.push(file);return json(file);}
  if(path.endsWith('/ai-precheck'))return json({sourceHash:'fixture',propertyVersion:0,files:current.files,checklist:[],review:null});
  if(path.endsWith('/ai-extract')){
   if(!good&&scenario==='outage')return route.fulfill({status:503,json:{message:'Quét tệp chưa thành công. Hãy thử quét lại; chưa thể sang bước thông tin.'}});
   if(!good&&scenario==='unrelated')return route.fulfill({status:422,json:{code:'DOCUMENT_INAPPROPRIATE',message:'Giấy tờ không phù hợp với mục đã chọn. Vui lòng gửi lại giấy tờ đúng loại.'}});
   const id=req.postDataJSON().fileId;if(good&&!current.acceptedFileIds.includes(id))current.acceptedFileIds.push(id);
   return json({sourceHash:'fixture',propertyVersion:0,files:current.files,checklist:[],review:{fileId:id,readable:true,purposeMatch:good,documentType:good?'RIGHT_DOCUMENT':'UNRELATED',extractedFields:[{field:'propertyName',value:good?'Nhà từ giấy tờ phù hợp':'KHÔNG ĐƯỢC ĐIỀN'}],findings:[]}});
  }
  unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
 });
 await page.setViewportSize({width,height:950});await page.goto(baseURL+'/account/properties/new/ownership?mode=manual');await page.getByRole('button',{name:'Bắt đầu hồ sơ mới',exact:true}).click();const upload=page.getByLabel('Giấy tờ sở hữu / quyền khai thác *',{exact:true});await upload.setInputFiles(imagePath);await page.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});
 await page.getByRole('button',{name:'Lưu và tiếp tục',exact:true}).click();await page.getByRole('alert').filter({hasText:'Chưa thể tiếp tục.'}).waitFor({state:'visible'});check(await page.getByText('Giấy tờ chưa được AI xác nhận phù hợp.',{exact:false}).count()===0,'Duplicate warning remains');check(await page.getByRole('button',{name:'Tải lại bản đã lưu',exact:true}).count()===0,'Duplicate reload remains');check(current.payload.step===0,'Advanced on wrong document');check(!current.payload.name,'Wrong document autofilled');
 current.payload.step=2;current.payload.extractionVersion=3;current.payload.extractedFileIds=current.files.map(f=>f.id);await page.reload();await page.getByRole('heading',{name:'Giấy tờ quyền cho thuê',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});check(await page.getByRole('heading',{name:'Các căn/phòng muốn cho thuê',exact:true}).count()===0,'Resume bypassed gate');
 await page.screenshot({path:`F:/2026/Fa26/DTD/tmp/document-gate-${scenario}-${width}.png`});
 await page.getByRole('listitem').filter({hasText:'unrelated.png'}).getByRole('button',{name:'Bỏ',exact:true}).click();await page.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});good=true;await upload.setInputFiles(imagePath);await page.getByText('Đã đọc giấy tờ phù hợp và tự điền thông tin.',{exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'Lưu và tiếp tục',exact:true}).click();await page.getByRole('heading',{name:'Thông tin, quyền cho thuê và ảnh tài sản',exact:true}).waitFor({state:'visible'});check(await page.getByLabel('Tên tài sản *',{exact:true}).inputValue()==='Nhà từ giấy tờ phù hợp','Valid document did not autofill');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');check(errors.length===0,JSON.stringify(errors));check(unexpected.length===0,JSON.stringify(unexpected));return {width,scenario,blockedBeforeInformation:true,resumeBlocked:true,reuploadRecovered:true,errors:0};
}
for(const width of [1440,390])for(const scenario of ['unrelated','outage','contradictory'])test(`Document gate ${scenario} ${width}px`,async({page,baseURL})=>{await documentGateScenario(page,width,scenario,fileURLToPath(new URL('./fixtures/manual-identity.png',import.meta.url)),baseURL);});

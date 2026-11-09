import { test } from '@playwright/test';


async function exerciseWizard(page, outputPath, origin) {


 const results=[];
 for(const width of [1440,390]){
  const context=await page.context().browser().newContext({viewport:{width,height:950}});
  const p=await context.newPage();const errors=[];const unexpected=[];let current=null,complete=null,serial=10,failAI=true,declared=null;
  const user={id:'1',fullName:'Người kiểm thử',email:'wizard@example.invalid',roles:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const respond=(r,value)=>r.fulfill({json:value});
  try{
   p.on('pageerror',e=>errors.push(e.message));
   p.on('console',m=>{if(m.type()==='error'&&!/503/.test(m.text()))errors.push(m.text());});
   p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
   await p.route('**/api/**',async r=>{
    const req=r.request(),path=new URL(req.url()).pathname,body=()=>req.postDataJSON();
    if(path.endsWith('/auth/csrf'))return respond(r,{token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/auth/refresh'))return respond(r,{accessToken:'fixture',expiresIn:900,user});
    if(path==='/api/v1/me')return respond(r,user);
    if(path.endsWith('/auth/vneid-config'))return respond(r,{enabled:false});
    if(path.endsWith('/me/verifications'))return respond(r,{emailVerified:true,vneid:{status:'VERIFIED',verifiedAt:'2026-11-01T00:00:00Z',identity:null}});
    if(path==='/api/v1/me/listing-drafts'){
     if(req.method()==='GET')return respond(r,current&&!current.completed?[current]:[]);
     current={propertyId:'5',version:0,propertyVersion:0,rightType:body().rightType,completed:false,payload:{},files:[]};return respond(r,current);
    }
    if(path==='/api/v1/me/listing-drafts/5'){
     if(req.method()==='PUT'){const input=body();if(input.version!==current.version)throw Error('Version mismatch');current={...current,payload:input.payload,version:current.version+1};}
     return respond(r,current);
    }
    if(path.endsWith('/listing-drafts/5/complete')){complete=body();current.completed=true;return respond(r,current);}
    if(path.endsWith('/rental-properties/5/evidence-files')){
     const purpose=(req.postData()||'').match(/name="purpose"\r\n\r\n([^\r]+)/)?.[1];const file={id:String(++serial),purpose,filename:purpose+'.pdf',contentType:'application/pdf',size:10};current.files.push(file);return respond(r,file);
    }
    if(path.endsWith('/rental-properties/5/ai-precheck')){declared=body().propertyFields;return respond(r,{sourceHash:'fixture-hash',propertyVersion:0,files:current.files,checklist:[],review:body().fileId?{fileId:body().fileId,readable:true,findings:[],extractedFields:[]}:null});}
    if(path.endsWith('/rental-properties/5/ai-extract')){
     if(failAI)return r.fulfill({status:503,json:{message:'AI tạm thời không khả dụng'}});
     return respond(r,{sourceHash:'fixture-hash',propertyVersion:0,files:[],checklist:[],review:{fileId:body().fileId,readable:true,findings:[],extractedFields:[{field:'principalName',value:'Lê Minh Khoa',page:1},{field:'principalDocumentNumber',value:'999000000101',page:1},{field:'propertyName',value:'Nhà tự điền',page:1},{field:'propertyAddress',value:'12 Đường Kiểm Thử, Phường Linh Trung, Thành phố Thủ Đức, TP. Hồ Chí Minh',page:1},{field:'certificateNumber',value:'GCN-001',page:1},{field:'certificateIssueDate',value:'15/12/2025',page:1},{field:'certificateIssuePlace',value:'Văn phòng đăng ký đất đai TP. Hồ Chí Minh',page:1},{field:'rightsValidFrom',value:'05/06/2026',page:1},{field:'rightsValidUntil',value:'31/12/2028',page:1}]}});
    }
    if(path==='/api/v1/me/property-images')return respond(r,[{id:String(++serial),url:'/unused'}]);
    if(path.startsWith('/api/v1/property-images/'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64')});
    if(path==='/api/v1/me/rental-properties')return respond(r,[]);
    if(path.includes('notification')||path.includes('notices')||path.endsWith('/tenancies'))return respond(r,[]);
    unexpected.push(path);return respond(r,[]);
   });
   await p.goto(`${origin}/account/properties/new/authorization`);
   await p.getByRole('button',{name:'Bắt đầu hồ sơ mới'}).click();
   const pdf={name:'rights.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fixture')};
   await p.getByLabel('Giấy tờ sở hữu / quyền khai thác *').setInputFiles(pdf);await p.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});
   failAI=false;await p.getByLabel('Giấy ủy quyền *').setInputFiles(pdf);await p.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});
   if(await p.getByRole('button',{name:'AI đọc giấy tờ'}).count())throw Error('Manual scan button remains');
   await p.getByRole('button',{name:'Lưu và tiếp tục'}).click();
   if(await p.getByRole('button',{name:'Dùng giá trị này'}).count())throw Error('Manual field application remains');
   const expected=[['Tên tài sản *','Nhà tự điền'],['Tỉnh/Thành phố *','TP. Hồ Chí Minh'],['Quận/Huyện/Khu vực *','Thủ Đức'],['Phường/Xã','Linh Trung'],['CCCD chủ sở hữu gốc *','999000000101'],['Quyền cho thuê từ ngày *','05/06/2026'],['Quyền cho thuê đến hết ngày *','31/12/2028'],['Ngày cấp giấy chứng nhận *','15/12/2025']];
   for(const [label,value] of expected)if(await p.getByLabel(label,{exact:true}).inputValue()!==value)throw Error('Autofill/date failed '+label);
   await p.getByRole('checkbox',{name:'Tôi đã đối chiếu thông tin khai báo với giấy tờ.'}).check();
   await p.getByRole('button',{name:'Lưu và tiếp tục'}).click();
   await p.reload();await p.getByRole('heading',{name:'Các căn/phòng muốn cho thuê'}).waitFor();
   await p.getByLabel('Cách cho thuê').selectOption('MULTI_UNIT');
   for(const [label,value] of [['Mã căn/phòng *','P101'],['Diện tích (m²) *','24'],['Giá thuê/tháng (đ) *','4000000'],['Đơn giá điện (đ/kWh) *','3500'],['Đơn giá nước (đ/m³) *','15000']])await p.getByLabel(label,{exact:true}).fill(value);
   await p.getByRole('button',{name:'Thêm phòng',exact:true}).click();
   await p.getByRole('checkbox').nth(1).uncheck();
   await p.getByRole('button',{name:'Lưu và tiếp tục'}).click();
   await p.getByRole('heading',{name:'Ảnh chung và ảnh từng phòng'}).waitFor();
   const png={name:'room.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64')};
   await p.locator('input[type=file]').nth(0).setInputFiles(png);await p.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});await p.getByText('Đã lưu tiến trình.',{exact:false}).waitFor();
   await p.locator('input[type=file]').nth(1).setInputFiles(png);await p.getByRole('button',{name:'Lưu tiến trình',exact:true}).click({trial:true});
   await p.getByRole('button',{name:'Lưu và tiếp tục'}).click();
   await p.getByRole('heading',{name:'Kiểm tra trước khi gửi'}).waitFor();
   await p.getByText('Đã đọc đủ 2 tệp; hãy xem từng nhận xét bên dưới.').waitFor();if(await p.getByRole('button',{name:'Quét chứng từ bằng AI',exact:true}).count())throw Error('Final manual scan button still present');if(declared?.address!=='12 Đường Kiểm Thử, Phường Linh Trung, Thành phố Thủ Đức, TP. Hồ Chí Minh')throw Error('Unsaved property declarations missing from precheck');
   await p.evaluate(()=>window.scrollTo(0,0));
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
   await p.screenshot({path:outputPath(`listing-wizard-${width}.png`),fullPage:true});
   await p.getByRole('button',{name:'Gửi hồ sơ kiểm duyệt',exact:true}).click();
   await p.waitForURL('**/account/rental-properties');
   if(complete.property.apartments.length!==1||complete.property.apartments[0].electricityIndex!==null||complete.dossier.principalDocumentNumber!=='999000000101'||complete.dossier.rightsValidFrom!=='2026-06-05'||complete.dossier.certificateIssueDate!=='2025-12-15')throw Error('Incorrect completion command');
   if(errors.length||unexpected.length)throw Error(JSON.stringify({errors,unexpected}));
   results.push({width,passed:true,savedReload:true,automaticUpload:true,partialFailureRecovered:true,automaticFields:true,addressParts:true,fixedDMY:true,unselectedRoomIgnored:true,privatePublicImages:true});
  }catch(e){throw Error(String(e)+" BODY "+(await p.locator("body").innerText()).slice(0,2200)+" ERR "+JSON.stringify({errors,unexpected}));}finally{await context.close();}
 }
 return results;
}

async function exerciseSourceAndGroups(page, outputPath, origin) {
 const results=[];
 for(const width of [1440,390]){
  const context=await page.context().browser().newContext({viewport:{width,height:950}});
  const p=await context.newPage();const errors=[];let imported=null,uploads=0,groupsQueries=[],roomQueries=[],unitUpdate=null;
  const user={id:'1',fullName:'Người kiểm thử',email:'fixture@example.invalid',roles:['CUSTOMER','OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await p.route('https://images.unsplash.com/**',r=>r.fulfill({status:204}));
   await p.route('**/api/**',r=>{
    const path=new URL(r.request().url()).pathname,query=new URL(r.request().url()).searchParams;
    const json=value=>r.fulfill({json:value});
    if(path.endsWith('/auth/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/auth/refresh'))return json({accessToken:'fixture',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/auth/vneid-config'))return json({enabled:false});
    if(path.endsWith('/me/verifications'))return json({emailVerified:true,vneid:{status:'VERIFIED'}});
    if(path.endsWith('/me/property-source-consent'))return json({consented:true,assetServiceAvailable:true,version:1});
    if(path.endsWith('/properties/vneid-assets'))return json([{asset:{externalAssetId:'asset1',name:'Tòa có 10 phòng',address:'12 Đường Nguồn',rentalMode:'MULTI_UNIT',units:Array.from({length:10},(_,i)=>({externalUnitId:'u'+i,code:'P'+(101+i),areaM2:24+i,bedrooms:1,bathrooms:1}))},sourceVersion:'a'.repeat(64),imported:false}]);
    if(path==='/api/v1/me/property-images')return json([{id:String(++uploads)}]);
    if(path.endsWith('/properties/vneid-imports')){imported=r.request().postDataJSON();return json({property:{id:'5'}});}
    if(path.includes('/payments/'))return json([]);
    if(path.includes('/invoices'))return json({items:[],page:0,size:20,totalElements:0,totalPages:0});
    if(path.endsWith('/me/properties')||path.endsWith('/me/tenancies')||path.includes('notification'))return json([]);
    if(path.endsWith('/apartments/address-options'))return json([{city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:null}]);
    if(path.endsWith('/apartments/property-groups')){
     groupsQueries.push(query.toString());return json({items:[{propertyId:'5',name:'Tòa có 10 phòng',address:'12 Đường Nguồn',minRent:query.get('maxRent')?'3000000':'3000000',maxRent:query.get('maxRent')?'4000000':'8000000',minArea:'24',maxArea:'33',matchingRooms:query.get('maxRent')?4:10,thumbnail:'/api/v1/property-images/1'}],page:0,size:6,totalElements:1,totalPages:1});
    }
    if(path==='/api/v1/me/apartments/101/images'){unitUpdate=r.request().postDataJSON();return r.fulfill({status:204});}
    if(path==='/api/v1/apartments/101')return json({id:'101',title:'P101',description:'Phòng thử',address:'12 Đường Nguồn',city:'Test',district:'Test',propertyName:'Tòa thử',areaM2:'24',advertisedMonthlyRent:'4000000',images:['/api/v1/property-images/2'],amenities:[],availability:'VACANT',publicationStatus:'PUBLISHED',bedrooms:1,bathrooms:1,publicOwner:{id:'1',displayName:'Owner',contactVerified:true},version:2,electricityUnitPrice:'3500',waterUnitPrice:'15000',management:{propertyId:'5',propertyVersion:3,approvalStatus:'APPROVED',verificationSource:null,canEdit:true,pricesEditable:true,priceLockReason:null,gallery:[{id:'1',url:'/api/v1/property-images/1'}],unitGallery:[{id:'2',url:'/api/v1/property-images/2'}],roomNumber:'P101',maxOccupants:2}});
    if(path==='/api/v1/apartments'){
     roomQueries.push(query.toString());const page=Number(query.get('page')||0);
     return json({items:Array.from({length:page===3?1:3},(_,i)=>({id:String(101+page*3+i),title:'P'+(101+page*3+i),address:'12 Đường Nguồn',areaM2:'24',advertisedMonthlyRent:'4000000',thumbnail:'/api/v1/property-images/1',availability:'VACANT',bedrooms:1,bathrooms:1})),page,size:3,totalElements:10,totalPages:4});
    }
    if(path.startsWith('/api/v1/property-images/'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64')});
    throw Error('Unexpected API '+path);
   });
   await p.goto(`${origin}/account/properties/new/ownership`);
   await p.getByRole('radio',{name:/Tòa có 10 phòng/}).check();
   await p.getByRole('checkbox').first().check();
   const png={name:'room.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64')};
   await p.locator('input[type=file]').nth(0).setInputFiles(png);
   await p.locator('input[type=file]').nth(1).setInputFiles(png);
   for(const [label,value] of [['Tỉnh/Thành phố *','TP. Hồ Chí Minh'],['Quận/Huyện/Khu vực *','Thủ Đức'],['Giá thuê/tháng (đ) *','4000000'],['Tiền cọc (đ) *','0'],['Đơn giá điện (đ/kWh) *','3500'],['Đơn giá nước (đ/m³) *','15000'],['Tầng *','1'],['Số người tối đa *','2']])await p.getByLabel(label,{exact:true}).fill(value);
   await p.getByRole('button',{name:'Thêm và cho thuê 1 phòng',exact:true}).click();
   await p.waitForURL('**/account/properties');
   if(imported.units.length!==1||!imported.units[0].imageIds.length||imported.units[0].electricityIndex!==null||imported.units[0].waterIndex!==null)throw Error('Source selection/photo/baseline payload incorrect');
   await p.goto(`${origin}/`);
   await p.getByText('10 căn/phòng phù hợp',{exact:false}).waitFor();
   if(await p.getByTestId('property-listing-card').count()!==1)throw Error('Property duplicated');
   await p.getByRole('button',{name:'Chọn căn/phòng',exact:true}).click();
   await p.getByRole('link',{name:/P101/}).waitFor();
   if(await p.getByRole('link',{name:/Xem phòng này/}).count()!==3)throw Error('More than one room page visible');
   await p.locator('#apartment-max-rent').fill('4000000');await p.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
   await p.getByText('4 căn/phòng phù hợp',{exact:false}).waitFor();
   await p.getByRole('button',{name:'Chọn căn/phòng',exact:true}).click();await p.getByRole('link',{name:/P101/}).waitFor();
   if(!groupsQueries.some(q=>q.includes('maxRent=4000000'))||!roomQueries.some(q=>q.includes('propertyId=5')&&q.includes('maxRent=4000000')))throw Error('Grouped and room filters diverged');
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
   await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:outputPath(`listing-group-${width}.png`),fullPage:true});
   await p.goto(`${origin}/apartments/101`);
   await p.getByRole('button',{name:'Quản lý ảnh riêng phòng',exact:true}).click();
   const editor=p.getByRole('region',{name:'Quản lý ảnh riêng căn/phòng'});
   await editor.getByLabel('Thêm ảnh tài sản',{exact:true}).setInputFiles(png);
   await editor.getByRole('button',{name:'Lưu thay đổi ảnh',exact:true}).click();
   await editor.getByRole('button',{name:'Lưu thay đổi ảnh',exact:true}).waitFor({state:'detached'});
   if(unitUpdate?.version!==2||!unitUpdate.imageIds.includes('2')||unitUpdate.imageIds.includes('1'))throw Error('Private room gallery used common images or wrong version');
   if(errors.length)throw Error(JSON.stringify(errors));results.push({width,sourceRoomPhotos:true,oneOfTenSelected:true,noInventedBaselines:true,groupedResults:true,roomPagination:true,sameFilters:true});
  }catch(e){throw Error(String(e)+' BODY '+(await p.locator('body').innerText()).slice(0,1800));}finally{await context.close();}
 }
 return results;
}

test('private listing wizard resumes and tolerates AI failures', async ({page}, info)=>{ await exerciseWizard(page, name=>info.outputPath(name), process.env.E2E_BASE_URL||'http://localhost:3000'); });

test('source room photos and property-group filters', async ({page}, info)=>{ await exerciseSourceAndGroups(page, name=>info.outputPath(name), process.env.E2E_BASE_URL||'http://localhost:3000'); });

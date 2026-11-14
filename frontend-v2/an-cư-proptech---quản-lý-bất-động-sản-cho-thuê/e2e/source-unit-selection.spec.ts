import {test,type Page} from '@playwright/test';

// Application browser checks with source/API fixtures; no live Auth0 or bank.
export async function checkSourceUnitSelection(page:Page,width:number,scenario:'append'|'all'|'blocked'|'stale'){
  const errors:string[]=[],failed:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
  page.on('console',m=>{if(m.type()==='error'&&!(scenario==='stale'&&m.text().includes('status of 409'))&&!m.location().url.endsWith('/favicon.ico'))consoleErrors.push(m.text());});
  const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZzL8AAAAASUVORK5CYII=';
  const user={id:'1',email:'source-test@example.invalid',fullName:'Chủ nhà kiểm thử',roles:scenario==='blocked'?['OWNER','CUSTOMER']:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:1};
  const property={id:'11',name:'Tài sản nguồn chọn phòng',address:'12 Đường thử',city:'Đà Nẵng',district:'Hải Châu',ward:null,approvalStatus:'APPROVED',rentalMode:'MULTI_UNIT',rightType:'OWNERSHIP',verificationSource:'AUTH0_VNEID_SIMULATION',version:4};
  const source=[{externalUnitId:'one',code:'P.101',areaM2:24,bedrooms:0,bathrooms:1},{externalUnitId:'two',code:'P.201',areaM2:30,bedrooms:1,bathrooms:1},{externalUnitId:'three',code:'P.301',areaM2:32,bedrooms:1,bathrooms:1}];
  const local=new Map<string,{id:string;title:string;roomNumber:string;areaM2:string;advertisedMonthlyRent:string;availability:string;publicationStatus:string;thumbnail:string;version:number}>();
  let creates=0,appends=0,uploads=0,staleHandled=false;
  const add=(ids:string[])=>ids.forEach(id=>{const room=source.find(u=>u.externalUnitId===id)!;local.set(id,{id:String(21+source.indexOf(room)),title:room.code,roomNumber:room.code,areaM2:String(room.areaM2),advertisedMonthlyRent:'5200000',availability:'VACANT',publicationStatus:id==='one'?'HIDDEN':'PUBLISHED',thumbnail:'data:image/png;base64,'+png,version:0});});
  if(scenario==='blocked')add(['one']);
  await page.route('https://accounts.google.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},cancel(){},disableAutoSelect(){}}}};'}));
  await page.route('**/api/**',async r=>{
    const path=new URL(r.request().url()).pathname;const json=(data:unknown,status=200)=>r.fulfill({json:data,status});
    if(path.endsWith('/auth/vneid-config'))return json({enabled:false});
    if(path.endsWith('/auth/refresh'))return json({accessToken:'source-session',expiresIn:900,user});
    if(path.endsWith('/auth/csrf'))return json({token:'source-csrf',headerName:'X-XSRF-TOKEN'});
    if(path==='/api/v1/me')return json({...user,roles:scenario==='blocked'||creates>0?['OWNER','CUSTOMER']:['CUSTOMER']});
    if(path==='/api/v1/me/verifications')return json({emailVerified:false,vneid:{status:'VERIFIED',verifiedAt:'2026-11-03T00:00:00Z',identity:{legalName:user.fullName,documentNumber:'000000000001',dateOfBirth:'1990-01-01',gender:'Nam',address:property.address}}});
    if(path==='/api/v1/me/property-source-consent')return json({consented:true,assetServiceAvailable:true,version:1});
    if(path==='/api/v1/me/properties')return json(local.size?[{property,apartments:[...local.values()]}]:[]);
    if(path==='/api/v1/owner/properties/vneid-assets')return json([{asset:{externalAssetId:'source-asset',name:property.name,address:property.address,rentalMode:'MULTI_UNIT',units:source},sourceVersion:(staleHandled?'b':'a').repeat(64),imported:local.size>0,propertyId:local.size?'11':null,propertyVersion:local.size?4:null,unitStates:[...local].map(([id,u])=>({externalUnitId:id,apartmentId:u.id,publicationStatus:u.publicationStatus})),appendBlockedReason:scenario==='blocked'?'SOURCE_UNIT_RECONCILIATION_REQUIRED':null}]);
    if(path==='/api/v1/me/property-images'){uploads++;return json([{id:String(90+uploads)}],201);}
    if(path==='/api/v1/owner/properties/vneid-imports'){
      creates++;check(r.request().headers().authorization==='Bearer source-session','Missing session');
      const body=r.request().postDataJSON();const ids=body.units.map((u:{externalUnitId:string})=>u.externalUnitId);
      check(body.imageIds.length===1&&body.units.every((u:{imageIds:string[]})=>u.imageIds.length===1),'Missing asset/unit images');check(body.externalAssetId==='source-asset','Wrong source');
      check(ids.length===(scenario==='all'?3:1)&&ids[0]==='one','Unselected source room submitted');add(ids);return json({property,apartments:[...local.values()]},201);
    }
    if(path==='/api/v1/owner/properties/11/vneid-units'){
      appends++;const body=r.request().postDataJSON();check(Object.keys(body).sort().join(',')==='sourceVersion,units,version','Append overwrites parent metadata');
      check(body.version===4&&body.units.length===1&&body.units[0].externalUnitId==='two','Wrong append selection');
      if(scenario==='stale'){staleHandled=true;add(['two']);return json({code:'SOURCE_UNIT_ALREADY_IMPORTED',message:'Phòng đã được thêm bởi lượt khác. Hãy tải lại danh sách.'},409);}
      add(['two']);return json({property,apartments:[...local.values()]},201);
    }
    if(path.includes('/notifications'))return json({items:[],unreadCount:0});
    return json([]);
  });
  await page.setViewportSize({width,height:950});
  if(scenario==='blocked'){
    await page.goto('/account/properties/new/ownership?propertyId=11');
    await page.getByRole('alert').filter({hasText:'Cần đối chiếu'}).waitFor();
    check(await page.getByTestId('vneid-unit-terms').count()===0,'Blocked source has editable terms');
    check(await page.getByRole('button',{name:'Bổ sung và cho thuê 0 phòng',exact:true}).isDisabled(),'Blocked import can submit');
  }else{
    await page.goto('/account/properties/new/ownership');await page.getByRole('radio',{name:/Tài sản nguồn chọn phòng/}).check();
    check(await page.getByTestId('vneid-unit-terms').count()===0,'Room selected without consent');
    check(await page.getByRole('link',{name:'Trang quản lý',exact:true}).count()===0,'Customer already has management navigation before import');
    if(scenario==='all')await page.getByRole('button',{name:'Chọn tất cả phòng chưa thêm',exact:true}).click();
    else await page.getByRole('checkbox',{name:/P\.101/}).check();
    const fill=async()=>{for(const form of await page.getByTestId('vneid-unit-terms').all()){
      const details=form.locator('details').first();if(await details.getAttribute('open')===null)await details.locator('summary').click();
      for(const [label,value] of [[/Giá thuê/,'5200000'],[/Tiền cọc/,'0'],[/Đơn giá điện/,'3500'],[/Đơn giá nước/,'15000'],[/Tầng/,'2'],[/Số người/,'2']] as const)await form.getByLabel(label).fill(value);
      await form.getByLabel('Thêm ảnh tài sản').setInputFiles({name:'room.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
    }};
    check(await page.getByTestId('vneid-unit-terms').count()===(scenario==='all'?3:1),'Unselected rooms require terms');
    await fill();await page.getByLabel('Tỉnh/Thành phố').fill('Đà Nẵng');await page.getByLabel('Quận/Huyện/Khu vực').fill('Hải Châu');
    await page.getByLabel('Thêm ảnh tài sản').first().setInputFiles({name:'asset.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
    await page.getByRole('button',{name:`Thêm và cho thuê ${scenario==='all'?3:1} phòng`,exact:true}).click();
    await page.waitForURL('**/account/properties');check(creates===1&&uploads===(scenario==='all'?4:2),'Initial import sent more than once or image upload missing');
    await page.getByRole('link',{name:'Trang quản lý',exact:true}).waitFor();
    if(scenario!=='all'){
      await page.getByRole('link',{name:'Bổ sung phòng từ Auth0',exact:true}).click();
      await page.getByRole('heading',{name:'Bổ sung phòng từ Auth0',exact:true}).waitFor();
      check(await page.getByRole('checkbox',{name:/P\.101/}).isDisabled(),'Hidden existing room can import twice');
      check(await page.getByLabel('Thêm ảnh tài sản').count()===0,'Append asks for asset images');
      await page.getByRole('checkbox',{name:/P\.201/}).check();await fill();
      await page.getByRole('checkbox',{name:/P\.201/}).uncheck();await page.getByRole('checkbox',{name:/P\.201/}).check();
      check(await page.getByTestId('vneid-unit-terms').getByLabel(/Giá thuê/).inputValue()==='5200000','Toggle discarded typed terms');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`test-results/visual/source-selection-${scenario}-${width}.png`,fullPage:true});
      await page.getByRole('button',{name:'Bổ sung và cho thuê 1 phòng',exact:true}).click();
      if(scenario==='stale'){
        await page.getByRole('alert').filter({hasText:'lượt khác'}).waitFor();
        check(await page.getByRole('button',{name:'Bổ sung và cho thuê 1 phòng',exact:true}).isDisabled(),'Stale append can be resubmitted');
        await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();
        await page.getByRole('status').filter({hasText:'Đã chọn 0/1'}).waitFor();
        check(await page.getByRole('checkbox',{name:/P\.201/}).isDisabled(),'Reload does not reconcile duplicate room');
      }else{
        await page.waitForURL('**/account/properties');check(local.size===2&&appends===1,'Append did not retain same property');
        await page.getByText('P.101 · 24 m² · Đã ẩn',{exact:true}).waitFor();
      }
      check(uploads===3,'Append must upload one room image without replacing parent images');
    }
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Horizontal overflow');
  check(!errors.length,JSON.stringify(errors));check(!failed.length,JSON.stringify(failed));check(!consoleErrors.length,JSON.stringify(consoleErrors));
  return {width,scenario,creates,appends,uploads,rooms:local.size,errors,failed,consoleErrors};
}
for(const width of [1440,390])for(const scenario of ['append','all','blocked','stale'] as const){
  test(`Source room selection ${scenario} at ${width}`,async({page})=>{await checkSourceUnitSelection(page,width,scenario);});
}

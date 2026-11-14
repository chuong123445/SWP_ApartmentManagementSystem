import { test } from '@playwright/test';

async function ownerAssistantScenario(page, width, baseURL = 'http://localhost:3196', stale = false) {
  const errors=[],unexpected=[],writes=[];let missing=true,contextReads=0;
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('status of 400'))errors.push(m.text());});
  page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  const user={id:'3',fullName:'Chủ nhà kiểm thử',email:'owner@example.invalid',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const tenancy={id:'42',apartmentId:'5',roomNumber:'A101',apartmentTitle:'Căn hộ A101',propertyName:'Tài sản kiểm thử',customerId:'2',customerName:'Khách thuê',customerEmail:'tenant@example.invalid',status:'ACTIVE',startDate:'2026-01-01',endDate:'2027-01-01',monthlyRent:'3000000',version:0};
  const billing={contractId:'42',apartmentId:'5',roomNumber:'A101',tenantName:'Khách thuê',period:'2026-11',monthlyRent:'3000000',electricityStartReading:'100',electricityUnitPrice:'3500',waterStartReading:'20',waterUnitPrice:'15000',waterBillingMode:'METERED',baselineVersion:0};
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,json=body=>route.fulfill({json:body});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/me/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/owner/properties'))return json([{id:'4',name:'Tài sản kiểm thử',approvalStatus:'APPROVED',rentalMode:'MULTI_UNIT'}]);
    if(path.endsWith('/owner/apartments'))return json([{id:'5',propertyId:'4',propertyName:'Tài sản kiểm thử',ownerId:'3',roomNumber:'A101',title:'Căn hộ A101',areaM2:'30',advertisedMonthlyRent:'3000000',publicationStatus:'HIDDEN',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',amenities:[],version:0}]);
    if(path.endsWith('/owner/tenancies'))return json([tenancy]);
    if(path.endsWith('/me/tenancies')||path.endsWith('/owner/maintenance-tickets'))return json([]);
    if(path.endsWith('/owner/financial-summary')){
      const totals={invoiceCount:0,paidInvoiceCount:0,onTimePaidInvoiceCount:0,billedAmount:'0',paidInvoiceAmount:'0',unpaidInvoiceAmount:'0',rentAmount:'0',electricityAmount:'0',waterAmount:'0',serviceAmount:'0'};
      const receipts={monthlyInvoiceAmount:'0',additionalAmount:'0',totalAmount:'0'};
      return json({propertyId:null,year:Number(url.searchParams.get('year')),asOf:'2026-11-13',totals,receipts,inventory:{units:1,occupied:1,vacant:0},arrears:{monthlyInvoiceCount:0,monthlyInvoiceAmount:'0',overdueInvoiceCount:0,overdueInvoiceAmount:'0',additionalCount:0,additionalAmount:'0'},properties:[],months:Array.from({length:12},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,invoices:totals,receipts}))});
    }
    if(path.endsWith('/owner/workspace-summary'))return json({propertyId:'4',asOf:'2026-11-13',expiringThrough:'2026-12-03',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
    if(path.endsWith('/owner/invoices'))return json({items:[],page:0,totalElements:0,totalPages:0});
    if(path.endsWith('/owner/rental-requests')){check(url.searchParams.get('status')==='PENDING','Wrong request status');check(url.searchParams.get('propertyId')==='4','Missing property scope');return json({items:[{id:'31',customerName:'Khách mới',apartmentTitle:'Phòng A102'}],page:0,totalElements:12,totalPages:2});}
    if(path.endsWith('/42/billing-context')){contextReads++;return json({...billing,baselineVersion:stale&&contextReads>1?1:0});}
    if(path.endsWith('/42/utility-invoice-suggestion')){
      const body=req.postDataJSON();check(body.period==='2026-11'&&body.baselineVersion===0,'Wrong suggestion source');
      if(missing)return route.fulfill({status:400,json:{code:'MISSING_READINGS',message:'Cần cung cấp chỉ số điện và nước cuối kỳ.'}});
      return json({contractId:'42',period:billing.period,baselineVersion:0,electricityEndReading:'150',waterEndReading:'28'});
    }
    if(req.method()!=='GET')writes.push(path);
    unexpected.push(req.method()+' '+path);return route.fulfill({status:404});
  });
  await page.setViewportSize({width,height:900});await page.goto(baseURL+'/app?tab=properties&propertyId=4');
  const launcher=page.getByRole('button',{name:'Mở trợ lý chủ nhà',exact:true});await launcher.waitFor({state:'visible'});await launcher.click();
  const panel=page.getByRole('dialog',{name:'Trợ lý chủ nhà',exact:true});
  await panel.getByRole('button',{name:'Có yêu cầu thuê mới không?',exact:true}).click();
  await panel.getByText('Có 12 yêu cầu thuê đang chờ xử lý',{exact:false}).waitFor({state:'visible'});
  await panel.getByRole('button',{name:'Lập hóa đơn điện nước',exact:true}).click();
  await panel.getByLabel('Phòng cần lập hóa đơn',{exact:true}).selectOption('42');
  const input=panel.getByLabel('Yêu cầu AI điền hóa đơn',{exact:true});await input.fill('Phòng A101 tháng này');
  await panel.getByRole('button',{name:'AI điền hóa đơn',exact:true}).click();
  await panel.getByText('Cần cung cấp chỉ số điện và nước cuối kỳ.',{exact:true}).waitFor({state:'visible'});
  missing=false;await input.fill('Phòng A101, điện cuối kỳ 150, nước cuối kỳ 28');await panel.getByRole('button',{name:'AI điền hóa đơn',exact:true}).click();
  await panel.getByRole('button',{name:'Áp dụng chỉ số để lập hóa đơn',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Lập hóa đơn',exact:true});await modal.waitFor({state:'visible'});
  const electricity=modal.getByLabel('Chỉ số điện cuối kỳ (kWh)',{exact:false});await electricity.waitFor({state:'visible'});
  if(stale){await modal.getByRole('alert').filter({hasText:'Kỳ hóa đơn hoặc chỉ số đầu kỳ đã thay đổi.'}).waitFor({state:'visible'});check(await electricity.inputValue()==='','Stale electricity applied');}
  else{check(await electricity.inputValue()==='150','AI electricity not applied');check(await modal.getByLabel('Chỉ số nước cuối kỳ (m³)',{exact:false}).inputValue()==='28','AI water not applied');}
  check(await modal.getByLabel('AI lập hóa đơn điện nước').count()===0,'AI remained inside invoice modal');
  check(writes.length===0,'Invoice was automatically created');check(contextReads>=2,'Context was not revalidated');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
  await modal.getByRole('button',{name:'Đóng',exact:true}).click();
  await panel.waitFor({state:'visible'});await page.screenshot({path:`F:/2026/Fa26/DTD/tmp/owner-assistant-${width}-${stale?'stale':'success'}.png`});
  check(errors.length===0,JSON.stringify(errors));check(unexpected.length===0,JSON.stringify(unexpected));
  return {width,requests:12,missingReadings:'blocked',invoiceAutoCreated:false,contextRevalidated:true,staleRejected:stale,errors:0};
}

for(const width of [1440,390])for(const stale of [false,true])test(`Owner assistant ${stale?'stale':'success'} at ${width}px`,async({page,baseURL})=>{await ownerAssistantScenario(page,width,baseURL,stale);});

import {test} from '@playwright/test';
const scenario=async(page,baseURL)=>{
 const results=[];for(const width of [1440,390])for(const code of ['CONTRACT_NOT_STARTED','UTILITY_PERIOD_IN_FUTURE']){
  const context=await page.context().browser().newContext({viewport:{width,height:950},baseURL});const p=await context.newPage();const errors=[],failed=[];let writes=0,ready=false;
  const user={id:'1',email:'owner@example.invalid',fullName:'Chủ nhà kiểm thử',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
  const message=code==='CONTRACT_NOT_STARTED'?'Hợp đồng chưa đến ngày bắt đầu. Chưa được chốt hoặc lập điện nước.':'Chưa được chốt hoặc lập điện nước cho kỳ tương lai. Hãy thực hiện khi đến tháng của kỳ hóa đơn.';
  const billing={contractId:'42',apartmentId:'21',roomNumber:'A.102',tenantName:'Khách kiểm thử',period:'2026-11',monthlyRent:'6000000',electricityStartReading:'300',waterStartReading:'20',electricityUnitPrice:'3500',waterUnitPrice:'15000',waterBillingMode:'METERED',baselineVersion:0,internetFee:'0',garbageFee:'0'};
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of 409/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
   await p.route('**/api/**',r=>{const req=r.request(),path=new URL(req.url()).pathname,json=body=>r.fulfill({json:body});
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'fixture'});if(path.endsWith('/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/notifications'))return json({items:[],unreadCount:0,totalElements:0,totalPages:0});
    if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-21',expiringThrough:'2026-12-11',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
    if(path.endsWith('/owner/financial-summary'))return json({});if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tài sản kiểm thử',approvalStatus:'APPROVED'}]);
    if(path.endsWith('/owner/tenancies'))return json([{id:'42',apartmentId:'21',roomNumber:'A.102',apartmentTitle:'Phòng kiểm thử',propertyName:'Tài sản kiểm thử',customerId:'2',customerName:'Khách kiểm thử',customerEmail:'tenant@example.invalid',status:'ACTIVE',startDate:'2026-11-06',endDate:'2027-11-06',monthlyRent:'6000000',version:0}]);
    if(path.endsWith('/42/billing-context'))return ready?json(billing):r.fulfill({status:409,json:{code,message}});
    if(path.endsWith('/42/invoices')||path.endsWith('/42/meter-readings')||path.endsWith('/42/utility-invoice-suggestion')){writes++;throw Error('Blocked period should not write');}
    if(path.endsWith('/owner/invoices')||path.endsWith('/owner/invoices/additional')||path.endsWith('/owner/maintenance-tickets'))return json({items:[],page:0,totalPages:0,totalElements:0});
    if(path.endsWith('/owner/apartments'))return json([{id:'21',propertyId:'11',propertyName:'Tài sản kiểm thử',ownerId:'1',roomNumber:'A.102',title:'Phòng kiểm thử',areaM2:'20',advertisedMonthlyRent:'6000000',amenities:[],publicationStatus:'PUBLISHED',availability:'OCCUPIED',propertyApprovalStatus:'APPROVED',version:0}]);return json([]);
   });
   await p.goto('/app?tab=invoices');await p.locator('#btn-create-invoice-page').click();const modal=p.getByRole('dialog',{name:'Lập hóa đơn',exact:true});await modal.getByRole('alert').filter({hasText:message}).waitFor();
   if(!await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).isDisabled()||!await modal.getByRole('button',{name:'Lập và gửi',exact:true}).isDisabled())throw Error('Future-period writes enabled');
   ready=true;await modal.getByRole('button',{name:'Tải lại',exact:true}).click();await modal.getByLabel('Điện đầu kỳ (kWh)',{exact:true}).waitFor();
   if(await modal.getByRole('button',{name:'Lưu bản nháp',exact:true}).isDisabled())throw Error('Valid current period did not recover');
   if(writes)throw Error('Unexpected money/meter command');if(await modal.evaluate(el=>el.scrollWidth>el.clientWidth)||await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
   results.push({width,code,errorVisible:true,writeButtonsDisabled:true,retryRecovers:true,writes,errors,failed});
  }finally{await context.close();}
 }return results;
};
test('future utility period errors block writes and retry recovers on desktop/mobile',async({page,baseURL})=>{await scenario(page,baseURL);});

import {test} from '@playwright/test';

async function financeAllocation(page,baseURL,outputPath){
 const results=[];const check=(value,message)=>{if(!value)throw Error(message);};
 for(const width of [1440,390])for(const mode of ['DASHBOARD','REPORTS','EMPTY','FAILURE']){
  const context=await page.context().browser().newContext({viewport:{width,height:1000}});const p=await context.newPage();p.setDefaultTimeout(15000);
  const errors=[],requests=[];let retry=false;
  const zero={invoiceCount:0,paidInvoiceCount:0,onTimePaidInvoiceCount:0,billedAmount:'0',paidInvoiceAmount:'0',unpaidInvoiceAmount:'0',rentAmount:'0',electricityAmount:'0',waterAmount:'0',serviceAmount:'0'};
  const noCash={monthlyInvoiceAmount:'0',additionalAmount:'0',totalAmount:'0'};
  try{
   p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('503'))errors.push(m.text());});p.on('pageerror',e=>errors.push(e.message));
   p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.failure()?.errorText);});
   await p.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname;const json=value=>route.fulfill({json:value});
    if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'fixture'});
    const user={id:'1',email:'owner@example.invalid',fullName:'Chủ nhà',roles:['OWNER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
    if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});
    if(path==='/api/v1/me')return json(user);if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path.endsWith('/owner/financial-summary')){
     requests.push(url.search);if(mode==='FAILURE'&&!retry)return route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Chưa tải được báo cáo'}});
     const year=Number(url.searchParams.get('year')),empty=mode==='EMPTY',amount=empty?'0':'85000000';
     const cash=empty?noCash:{monthlyInvoiceAmount:'119000000',additionalAmount:'0',totalAmount:'119000000'};
     const inventory={units:2,occupied:1,vacant:1};
     return json({year,propertyId:url.searchParams.get('propertyId'),asOf:'2026-11-14',allocatedRentAmount:amount,totals:{...zero,billedAmount:empty?'0':'68000000'},receipts:cash,inventory,
      arrears:{monthlyInvoiceCount:0,monthlyInvoiceAmount:'0',overdueInvoiceCount:0,overdueInvoiceAmount:'0',additionalCount:0,additionalAmount:'0'},
      months:Array.from({length:12},(_,i)=>({period:`${year}-${String(i+1).padStart(2,'0')}`,allocatedRentAmount:!empty&&i<10?'8500000':'0',invoices:zero,receipts:i===10?cash:noCash})),
      properties:[{id:'11',name:'Tòa A',inventory,invoices:zero,receipts:cash,allocatedRentAmount:amount}]});
    }
    if(path.endsWith('/owner/properties'))return json([{id:'11',name:'Tòa A',approvalStatus:'APPROVED'}]);
    if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-14',expiringThrough:'2026-12-04',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:1,expiredContractCount:1});
    if(path.endsWith('/owner/apartments')||path.endsWith('/owner/tenancies')||path.endsWith('/me/tenancies'))return json([]);
    if(['/owner/rental-requests','/owner/invoices','/owner/invoices/additional','/owner/maintenance-tickets','/me/notifications'].some(s=>path.endsWith(s)))return json({items:[],page:0,totalPages:0,totalElements:0,unreadCount:0});
    errors.push('Unexpected '+path);return json([]);
   });
   const tab=mode==='DASHBOARD'?'dashboard':'reports';await p.goto(new URL('/app?tab='+tab+'&propertyId=11',baseURL).href);
   if(mode==='FAILURE'){await p.getByRole('alert').filter({hasText:'Chưa tải được báo cáo'}).waitFor();retry=true;await p.getByRole('button',{name:'Tải lại số liệu',exact:true}).click();}
   const title=mode==='DASHBOARD'?'Tiền thực thu theo tháng':'Tiền thuê phân bổ và thực thu theo tháng';await p.getByRole('heading',{name:title,exact:true}).waitFor();
   check(!await p.getByRole('heading',{name:'Hóa đơn đã gửi và tiền nhận theo tháng',exact:true}).count(),'Old ambiguous chart persists');
   if(mode==='DASHBOARD'){check(!await p.getByText('Tiền thuê phân bổ',{exact:true}).count(),'Dashboard duplicates allocation chart');await p.getByRole('heading',{name:'Cần theo dõi',exact:true}).waitFor();}
   else{
    const heading=p.getByRole('heading',{name:/Đối chiếu tiền thuê và thực thu từng tháng/});await heading.waitFor();
    const table=heading.locator('..').getByRole('table');const jan=table.getByRole('row').filter({hasText:'2026-01'});const nov=table.getByRole('row').filter({hasText:'2026-11'});
    check((await jan.innerText()).includes(mode==='EMPTY'?'0 đ':'8.500.000 đ'),'Monthly allocation missing');
    if(mode!=='EMPTY')check((await nov.innerText()).includes('119.000.000 đ'),'Payment-date cash missing');
    if(mode==='REPORTS'){
     await p.getByRole('spinbutton',{name:'Năm báo cáo',exact:true}).fill('2025');await p.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await p.getByRole('heading',{name:/Đối chiếu.*2025/}).waitFor();
     check(requests.some(query=>query.includes('year=2025')&&query.includes('propertyId=11')),'Year/property scope lost');
     const download=p.waitForEvent('download');await p.getByRole('button',{name:'Xuất CSV',exact:true}).click();check((await download).suggestedFilename()==='bao-cao-tai-chinh-2025-tai-san-11.csv','Wrong export scope');
    }
   }
   check(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Horizontal page overflow');check(!errors.length,JSON.stringify(errors));
   const chart=p.getByRole('heading',{name:title,exact:true}).locator('..');await chart.scrollIntoViewIfNeeded();await p.waitForTimeout(1700); // Allow Recharts' default entrance animation to finish before visual capture.
   await chart.screenshot({path:outputPath(`finance-chart-${mode}-${width}.png`)});
   await p.screenshot({path:outputPath(`finance-${mode}-${width}.png`),fullPage:true});results.push({width,mode,passed:true});
  }finally{await context.close();}
 }
 return results;
}
test('Overview cash and allocated-rent reports on desktop/mobile',async({page,baseURL},info)=>{test.setTimeout(180000);await financeAllocation(page,baseURL,name=>info.outputPath(name));});

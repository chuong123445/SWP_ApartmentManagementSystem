import { test } from '@playwright/test';
const scenario=async(page,baseURL,outputPath)=>{
 const out=[];for(const width of [1440,390]){
  const ctx=await page.context().browser().newContext();const p=await ctx.newPage();const errors=[],failed=[],queries=[];let suggestions=0,applies=0,fail=false;
  const filters={q:null,city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:null,minRent:null,maxRent:'4999999.99',minArea:'25',maxArea:null,bedrooms:null,occupants:2};
  try{
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of (401|503)/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
   await p.route('https://images.unsplash.com/**',r=>r.fulfill({status:204}));await p.route('https://accounts.google.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){},cancel(){}}}}'}));
   await p.route('**/api/**',async r=>{const req=r.request(),u=new URL(req.url()),path=u.pathname,json=body=>r.fulfill({json:body});
    if(path.endsWith('/auth/refresh'))return r.fulfill({status:401,json:{message:'not logged in'}});if(path.endsWith('/auth/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});if(path.endsWith('/auth/vneid-config'))return json({enabled:false});
    if(path.endsWith('/apartments/address-options'))return json([{city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:'Test'}]);
    if(path.endsWith('/apartments/ai-search')){suggestions++;if(!req.postDataJSON().consent)throw Error('No consent');return fail?r.fulfill({status:503,json:{message:'AI chưa sẵn sàng'}}):json({runId:'fixture-id',sourceHash:'hash',model:'fixture-model',promptVersion:'apartment-search-v1',createdAt:new Date().toISOString(),filters,notes:['Chưa hỗ trợ khoảng cách đến trường.'],canApply:true});}
    if(path.endsWith('/apartments/ai-search/fixture-id/apply')){applies++;const body=req.postDataJSON();if(body.filters.minArea!=='28')throw Error('User edited filter lost');return json(body.filters);}
    if(path==='/api/v1/apartments'){queries.push(u.search);const selected=u.searchParams.has('minArea');return json({items:selected?[]:[{id:'1',title:'Phòng minh họa',address:'Thủ Đức',city:'TP. Hồ Chí Minh',district:'Thủ Đức',areaM2:'30',advertisedMonthlyRent:'4000000',thumbnail:'/images/apartment-placeholder.svg',availability:'VACANT',bedrooms:1,bathrooms:1}],page:0,size:6,totalPages:selected?0:1,totalElements:selected?0:1});}
    return json([]);
   });
   await p.setViewportSize({width,height:1000});await p.goto(baseURL);const panel=p.getByRole('region',{name:'AI hỗ trợ tìm căn hộ'});await panel.getByLabel('Nhu cầu tìm phòng',{exact:true}).fill('Phòng dưới 5 triệu, từ25m2 tại Thủ Đức cho2người gần trường');
   if(!await panel.getByRole('button',{name:'Phân tích nhu cầu bằng AI'}).isDisabled())throw Error('Consent not required');await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Phân tích nhu cầu bằng AI'}).click();await panel.getByRole('heading',{name:'Kiểm tra bộ lọc AI đề xuất'}).waitFor();if(applies!==0||queries.some(q=>q.includes('minArea')))throw Error('AI auto applied');
   await panel.getByLabel('Diện tích tối thiểu (m²)',{exact:true}).fill('28');await panel.getByRole('button',{name:'Áp dụng bộ lọc và tìm phòng'}).click();await p.getByRole('heading',{name:'Chưa có căn hộ phù hợp'}).waitFor();if(!queries.some(q=>q.includes('minArea=28')&&q.includes('occupants=2')&&q.includes('maxRent=4999999.99')))throw Error('Filters not queried together');
   await p.getByLabel('Diện tích tối thiểu (m²)',{exact:true}).fill('29');await p.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await p.waitForTimeout(100);if(!queries.some(q=>q.includes('minArea=29')))throw Error('Area-only change did not refetch');
   fail=true;await panel.getByLabel('Nhu cầu tìm phòng',{exact:true}).fill('Thử lỗi provider');await panel.getByRole('button',{name:'Phân tích nhu cầu bằng AI'}).click();await panel.getByRole('alert').waitFor();if(await panel.getByRole('button',{name:'Áp dụng bộ lọc và tìm phòng'}).count())throw Error('Stale suggestions on failure');
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');await p.screenshot({path:outputPath(`ai01-${width}.png`),fullPage:true});if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));out.push({width,passed:true,explicitConsent:true,editableBeforeApply:true,sameRoomFilters:true,areaOnlyRefetch:true,emptyResults:true,providerFallback:true,errors,failed});
  }catch(e){throw Error(String(e)+" BODY "+(await p.locator("body").innerText()).slice(0,3000)+" ERR "+JSON.stringify({errors,failed,queries}));}finally{await ctx.close();}
 }return out;
}
;
test('AI search consent, review, filters, failure and responsive layout',async({page,baseURL},info)=>{test.setTimeout(60000);await scenario(page,baseURL,name=>info.outputPath(name));});

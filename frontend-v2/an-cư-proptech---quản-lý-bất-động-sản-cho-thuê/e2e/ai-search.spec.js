import { test } from '@playwright/test';
const scenario=async(page,baseURL,outputPath)=>{
 const out=[];for(const width of [1440,390]){
  const ctx=await page.context().browser().newContext();const p=await ctx.newPage();const errors=[],failed=[],queries=[];let chats=0,applies=0,fail=false,applyFail=false,previewFail=false;
  const filters={q:null,city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:null,minRent:null,maxRent:'4999999.99',minArea:'25',maxArea:null,bedrooms:null,occupants:2};
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/status of (401|503)/.test(m.text()))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
  try{
   await p.route('https://images.unsplash.com/**',r=>r.fulfill({status:204}));await p.route('https://accounts.google.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){},cancel(){}}}}'}));
   await p.route('**/api/**',async r=>{const req=r.request(),u=new URL(req.url()),path=u.pathname,json=body=>r.fulfill({json:body});
    if(path.endsWith('/auth/refresh'))return r.fulfill({status:401,json:{message:'not logged in'}});if(path.endsWith('/auth/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});if(path.endsWith('/auth/vneid-config'))return json({enabled:false});
    if(path.endsWith('/apartments/address-options'))return json([{city:'TP. Hồ Chí Minh',district:'Thủ Đức',ward:'Test'}]);

    if(path.endsWith('/apartments/ai-chat')){chats++;const body=req.postDataJSON();if(!body.consent)throw Error('Missing consent');if(chats===2&&!body.history.some(m=>m.text==='Xin chào'))throw Error('History missing');if(fail)return r.fulfill({status:503,json:{message:'AI chưa sẵn sàng'}});const search=body.text!=='Xin chào';return json({reply:search?'Mình sẽ tìm phòng theo nhu cầu của bạn.':'Chào bạn! Mình có thể giải đáp về thuê nhà.',search:{runId:'fixture-id',filters:search?filters:Object.fromEntries(Object.keys(filters).map(k=>[k,null])),notes:[],canApply:search}});}
    if(path.endsWith('/apartments/ai-search/fixture-id/apply')){applies++;if(applyFail)return r.fulfill({status:503,json:{message:'Chưa áp dụng được bộ lọc'}});return json(req.postDataJSON().filters);}
    if(path==='/api/v1/apartments/property-groups'){queries.push(u.search);return json({items:[],page:0,size:6,totalPages:0,totalElements:0});}
    if(path==='/api/v1/apartments'){
     if(previewFail)return r.fulfill({status:503,json:{message:'Chưa tải được phòng'}});
     if(u.searchParams.get('minArea')!=='25'||u.searchParams.get('maxRent')!=='4999999.99'||u.searchParams.get('occupants')!=='2'||u.searchParams.get('size')!=='3')throw Error('Room preview used different filters');
     return json({items:[{id:'42',title:'Studio thử nghiệm',address:'Thủ Đức',advertisedMonthlyRent:'4000000',areaM2:'30'}],page:0,size:3,totalPages:1,totalElements:1});
    }
    return json([]);
   });
   await p.setViewportSize({width,height:900});await p.goto(baseURL);
   if(await p.getByRole('dialog').count())throw Error('Chat open by default');
   if(await p.getByRole('button',{name:'Phân tích nhu cầu bằng AI'}).count())throw Error('Old CTA remains');
   const entry=p.getByRole('button',{name:'Trợ lý AI',exact:true});await entry.click();
   const panel=p.getByRole('dialog',{name:'Trợ lý An Cư AI'});const input=panel.getByRole('textbox',{name:'Tin nhắn cho AI'});
   await panel.getByRole('button',{name:'Tìm phòng theo ngân sách'}).click();
   if(!(await input.inputValue()).includes('dưới 5 triệu')||chats)throw Error('Starter did not fill an editable draft');
   await input.press('Escape');
   if(await entry.getAttribute('aria-expanded')!=='false'||!await entry.evaluate(button=>document.activeElement===button))throw Error('Inline launcher did not restore focus');
   await p.getByRole('button',{name:'Mở chat AI'}).click();await input.fill('Xin chào');
   const queryCount=queries.length;
   if(await panel.getByRole('checkbox').count())throw Error('AI consent checkbox remains');await panel.getByRole('button',{name:'Gửi tin nhắn'}).click();await panel.getByText('Chào bạn! Mình có thể giải đáp về thuê nhà.',{exact:true}).waitFor();if(applies||queries.length!==queryCount)throw Error('Ordinary chat submitted search filters');
   await input.fill('Tìm phòng dưới 5 triệu từ25m2 tại Thủ Đức cho2người');await panel.getByRole('button',{name:'Gửi tin nhắn'}).click();await panel.getByText(/Đã cập nhật bộ lọc/).waitFor();
   const room=panel.getByRole('link',{name:/Studio thử nghiệm/});await room.waitFor();
   if(await room.getAttribute('href')!=='/apartments/42')throw Error('Wrong public room link');
   if(!queries.some(q=>q.includes('minArea=25')&&q.includes('occupants=2')&&q.includes('maxRent=4999999.99')))throw Error('No automatic query');
   if(await p.locator('#apartment-max-rent').inputValue()!=='4999999.99'||await p.locator('#apartment-occupants').inputValue()!=='2')throw Error('Main filters not synced');
   if(await p.getByRole('heading',{name:'Kiểm tra bộ lọc AI đề xuất'}).count())throw Error('Old review form remains');
   if(await p.locator('#apartment-search, #apartment-min-area, #apartment-max-area').count())throw Error('Removed manual fields remain');
   await panel.getByRole('button',{name:'Xem kết quả trên trang'}).click();
   await panel.waitFor({state:'hidden'});
   await p.locator('#apartment-occupants').fill('4');await p.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await p.waitForTimeout(100);
   const manual=new URLSearchParams(queries.at(-1));if(manual.get('occupants')!=='4'||manual.has('q')||manual.has('minArea')||manual.has('maxArea'))throw Error('Manual search retained removed filters');
   await p.getByRole('button',{name:'Xóa bộ lọc',exact:true}).first().click();await p.waitForTimeout(100);if(await p.locator('#apartment-occupants').inputValue()!=='')throw Error('Occupants not cleared');
   await p.locator('#apartment-occupants').fill('2');await p.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await p.waitForTimeout(100);
   await p.screenshot({path:outputPath(`simple-home-${width}.png`)});
   await p.getByRole('button',{name:'Mở chat AI'}).click();
   const box=await panel.boundingBox();if(!box||box.x+box.width>width||box.x<0)throw Error('Chat outside viewport');
   await panel.getByRole('button',{name:'Đóng chat AI'}).click();await p.getByRole('button',{name:'Mở chat AI'}).click();if(!await panel.getByText('Chào bạn! Mình có thể giải đáp về thuê nhà.',{exact:true}).count())throw Error('History lost');
   await input.press('Escape');await p.getByRole('button',{name:'Mở chat AI'}).click();
   fail=true;const count=applies;await input.fill('Thử lỗi AI');await input.press('Enter');await panel.getByRole('alert').waitFor();if(applies!==count||await p.locator('#apartment-occupants').inputValue()!=='2')throw Error('Error changed filters');
   fail=false;applyFail=true;await input.fill('Tìm lại phòng');await input.press('Enter');await panel.getByRole('alert').filter({hasText:'Chưa áp dụng được'}).waitFor();
   applyFail=false;previewFail=true;await input.fill('Tìm lại theo tiêu chí vừa rồi');await input.press('Enter');
   await panel.getByText(/Chưa tải được danh sách trong chat/).waitFor();
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
   await p.waitForTimeout(400);
   await p.screenshot({path:outputPath(`ai-chat-${width}.png`)});if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
   out.push({width,passed:true,chats,applies,history:true,autoFilter:true,normalConversation:true,providerAndApplyFailure:true,overflow:false,errors,failed});
  }finally{await ctx.close();}
 }return out;
};
test('floating AI chat and automatic search on desktop/mobile',async({page,baseURL},info)=>{await scenario(page,baseURL,name=>info.outputPath(name));});

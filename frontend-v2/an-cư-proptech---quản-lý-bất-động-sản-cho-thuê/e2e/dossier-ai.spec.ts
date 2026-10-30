import {test,expect,type Page} from '@playwright/test';

async function setup(page:Page,mode:'issues'|'consistent'|'waiting'|'error'='issues'){
  const decisions:any[]=[];const retries:any[]=[];
  let dossier:any={id:'9',propertyId:'11',propertyName:'Tài sản kiểm thử AI',propertyAddress:'12 Đường kiểm thử',applicantName:'Người nộp kiểm thử',rightType:'OWNERSHIP',bank:'Ngân hàng thử',accountNumber:'00011111',accountHolderName:'Người nộp kiểm thử',status:'PENDING_APPROVAL',files:[{id:'7',purpose:'RIGHT_DOCUMENT',filename:'giay-chung-nhan.png',contentType:'image/png',size:100}],submittedAt:'2026-10-30T08:00:00Z',reviewedAt:null,reviewReason:null,version:0};
  let review:any={status:mode==='waiting'?'WAITING_CONFIGURATION':'COMPLETED',sourceHash:'a'.repeat(64),model:'test-model',promptVersion:'dossier-review-v1',attempts:mode==='waiting'?0:1,version:0,createdAt:'2026-10-30T08:00:00Z',startedAt:null,finishedAt:null,errorCode:null,result:mode==='waiting'?null:{verdict:mode==='consistent'?'CONSISTENT':'ISSUES_FOUND',summary:mode==='consistent'?'Chưa phát hiện thông tin không khớp.':'Cần admin đối chiếu tên người nộp.',overallFindings:[],files:[{fileId:'7',readable:true,documentType:'Giấy chứng nhận',extractedFields:[{field:'applicantName',value:'Tên trong giấy tờ'}],findings:mode==='consistent'?[]:[{type:'MISMATCH',field:'applicantName',message:'Tên trên giấy không trùng khai báo.',declaredValue:'Người nộp kiểm thử',observedValue:'Tên trong giấy tờ'}]}]}};
  await page.route('**/api/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname;const json=(body:unknown)=>route.fulfill({json:body});
    if(path.endsWith('/refresh'))return json({accessToken:'test-token',tokenType:'Bearer',expiresIn:900,user:{id:'1',email:'admin@example.invalid',fullName:'Admin kiểm thử',roles:['ADMIN'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0}});
    if(path.endsWith('/csrf'))return json({headerName:'X-XSRF-TOKEN',token:'test'});
    if(path.endsWith('/vneid-config'))return json({enabled:false});
    if(path==='/api/v1/admin/property-dossiers')return json({items:dossier.status==='PENDING_APPROVAL'?[dossier]:[],totalPages:1,totalElements:1,page:0});
    if(path.endsWith('/property-dossiers/9'))return json(dossier);
    if(path.endsWith('/9/ai-review/retry')){retries.push(req.postDataJSON());review={...review,status:'QUEUED',result:null,version:1};return route.fulfill({status:202,json:review});}
    if(path.endsWith('/9/ai-review'))return mode==='error'?route.fulfill({status:500,json:{message:'Không tải được kết quả AI.'}}):json(review);
    if(path.endsWith('/9/decisions')){const body=req.postDataJSON();decisions.push(body);dossier={...dossier,status:body.decision==='APPROVE'?'APPROVED':'REJECTED',version:1};return json(dossier);}
    return route.fulfill({status:404,json:{message:'Unexpected fixture route '+path}});
  });
  await page.goto('/admin/property-dossiers');await page.getByTestId('admin-dossier-card').click();return {decisions,retries};
}
test('AI cảnh báo nhưng không tự từ chối; admin vẫn tự phê duyệt sau đối chiếu',async({page},info)=>{
  const state=await setup(page);const panel=page.getByRole('region',{name:'AI hỗ trợ kiểm tra hồ sơ'});
  await expect(panel.getByText('Có điểm cần đối chiếu / bổ sung')).toBeVisible();await expect(panel).toContainText('Tên trên giấy không trùng khai báo.');expect(state.decisions).toHaveLength(0);
  await expect(page.getByRole('button',{name:'Phê duyệt tài sản',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:/Đã đối chiếu người nộp/}).check();await expect(page.getByRole('button',{name:'Phê duyệt tài sản',exact:true})).toBeEnabled();
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('admin-doi-chieu-ai.png'),fullPage:true});
  await page.getByRole('button',{name:'Phê duyệt tài sản',exact:true}).click();await expect.poll(()=>state.decisions.length).toBe(1);expect(state.decisions[0].decision).toBe('APPROVE');expect(state.decisions[0].rightsConfirmed).toBe(true);
});
test('Chưa kết nối AI không ngăn admin xử lý thủ công',async({page})=>{
  const state=await setup(page,'waiting');await expect(page.getByText('Chưa kết nối AI',{exact:true})).toBeVisible();expect(state.decisions).toHaveLength(0);
  await page.getByLabel('Ý kiến kiểm duyệt').fill('Admin kiểm tra bản gốc và từ chối.');await page.getByRole('button',{name:'Từ chối hồ sơ',exact:true}).click();await expect.poll(()=>state.decisions.length).toBe(1);expect(state.decisions[0].decision).toBe('REJECT');
});
test('AI không phát hiện bất thường cũng không tự phê duyệt; quét lại là thao tác riêng',async({page})=>{
  const state=await setup(page,'consistent');const panel=page.getByRole('region',{name:'AI hỗ trợ kiểm tra hồ sơ'});await expect(panel.getByText('Chưa phát hiện bất thường',{exact:true})).toBeVisible();expect(state.decisions).toHaveLength(0);
  await panel.getByRole('button',{name:'Quét lại hồ sơ',exact:true}).click();await expect.poll(()=>state.retries.length).toBe(1);expect(state.retries[0]).toEqual({version:0});expect(state.decisions).toHaveLength(0);
});
test('Lỗi tải kết quả AI không khóa nút quyết định thủ công',async({page})=>{
  const state=await setup(page,'error');await expect(page.getByText('Không tải được kết quả AI.',{exact:true})).toBeVisible();await page.getByRole('checkbox',{name:/Đã đối chiếu người nộp/}).check();await expect(page.getByRole('button',{name:'Phê duyệt tài sản',exact:true})).toBeEnabled();expect(state.decisions).toHaveLength(0);
});

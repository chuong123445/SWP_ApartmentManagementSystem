import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
const scenario=async(page,baseURL,pdf,screenshot)=>{
 const results=[];
 for(const width of [1440,390])for(const mode of ['propose','object','finalize']){
  const ctx=await page.context().browser().newContext({viewport:{width,height:950}});const p=await ctx.newPage();
  try{
   const owner=mode!=='object',actor=owner?'1':'2';let state=mode==='propose'?'NONE':'PENDING',version=0,writes=0,uploads=0,staleUsed=false;const errors=[],unknown=[];
   let notice=state==='NONE'?null:{proposerId:'1',reason:'Người thuê rời đi, không liên lạc được.',clauseReference:'Điều khoản đã ký',proposedAt:'2026-10-01T00:00:00Z',responseDeadline:'2026-10-31T00:00:00Z',objectionReason:null,respondedAt:null,completionNotes:null,completionEvidenceIds:[],completedAt:null};
   const evidence=[];const user={id:actor,fullName:owner?'Chủ nhà kiểm thử':'Người thuê kiểm thử',email:'fixture@example.invalid',roles:owner?['OWNER','CUSTOMER']:['CUSTOMER'],accountStatus:'ACTIVE',contactVerificationStatus:'VERIFIED',version:0};
   const draft=()=>({id:'42',rentalRequestId:'7',contractNumber:'HD-42',status:state==='COMPLETED'?'ENDED':'ACTIVE',version:0,startDate:'2026-01-01',endDate:'2027-12-31',monthlyRent:'5000000',deposit:'10000000',electricityUnitPrice:'3500',waterUnitPrice:'15000',paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[],createdAt:'2026-01-01T00:00:00Z',lifecycle:{version:0,expired:false,handoverAvailable:false,renewalRequestAvailable:false,previousContractId:null,renewalContractId:null,renewalRequest:null,handover:null,endReason:state==='COMPLETED'?'UNILATERAL_ABANDONMENT':null},snapshot:{owner:{id:'1',fullName:'Chủ nhà kiểm thử'},customer:{id:'2',fullName:'Người thuê kiểm thử'},asset:{title:'Phòng kiểm thử',roomNumber:'X101',address:'Đà Nẵng',areaM2:'30',amenities:[]}},signing:{ownerAccountId:'1',customerAccountId:'2',contentHash:'a'.repeat(64),state:'SIGNED',ownerSignedAt:'2026-01-01T00:00:00Z',customerSignedAt:'2026-01-01T00:01:00Z',ownerSignature:null,customerSignature:null}});
   const data=()=>({contractId:'42',contractStatus:draft().status,ownerId:'1',customerId:'2',today:'2026-11-22',startDate:'2026-01-01',endDate:'2027-12-31',sourceVersion:version.toString(16).padStart(64,'0'),terminationState:'NONE',termination:null,handoverState:'NONE',handover:null,canProposeTermination:false,canRespondTermination:false,canWithdrawTermination:false,canProposeHandover:false,canConfirmHandover:false,canDisputeHandover:false,canCancelHandover:false,document:null,signing:null,canSign:false,evidence,history:[],unilateralState:state,unilateral:notice,canProposeUnilateral:owner&&['NONE','WITHDRAWN'].includes(state),canObjectUnilateral:!owner&&state==='PENDING',canWithdrawUnilateral:owner&&state==='PENDING',canFinalizeUnilateral:owner&&state==='PENDING'&&mode==='finalize'});
   p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('status of 409'))errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
   await p.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname,json=body=>route.fulfill({json:body});
    if(path.endsWith('/csrf'))return json({token:'fixture',headerName:'X-XSRF-TOKEN'});if(path.endsWith('/refresh'))return json({accessToken:'fixture',tokenType:'Bearer',expiresIn:900,user});if(path.endsWith('/vneid-config'))return json({enabled:false});if(path==='/api/v1/me')return json(user);
    if(path.endsWith('/notifications'))return json({items:[],totalElements:0,totalPages:0,unreadCount:0});
    if(path.endsWith('/tenancies'))return json([]);
    if(path==='/api/v1/contracts/42')return json(draft());if(path==='/api/v1/contracts/42/pdf')return route.fulfill({contentType:'application/pdf',body:pdf});
    if(path==='/api/v1/contracts/42/exit')return json(data());
    if(path==='/api/v1/contracts/42/exit/evidence'){
     uploads++;const file={id:String(uploads+9),filename:'Chứng cứ thu hồi '+uploads,uploaderId:actor,createdAt:'2026-11-22T00:00:00Z'};evidence.push(file);return route.fulfill({status:201,json:file});
    }
    if(path==='/api/v1/contracts/42/exit/actions'){
     const body=req.postDataJSON();writes++;if(body.sourceVersion!==version.toString(16).padStart(64,'0')||body.consent!==true)throw Error('Missing version/consent');
     if(mode==='finalize'&&width===390&&!staleUsed){staleUsed=true;version++;return route.fulfill({status:409,json:{code:'STALE_VERSION',message:'Thông báo đã thay đổi. Hãy tải lại.'}});}
     if(body.action==='PROPOSE_UNILATERAL_TERMINATION'){
      if(!body.unilateral.reason||!body.unilateral.clauseReference)throw Error('Missing proposal');state='PENDING';notice={proposerId:'1',...body.unilateral,proposedAt:'2026-11-22T00:00:00Z',responseDeadline:'2026-12-22T00:00:00Z',objectionReason:null,respondedAt:null,completionNotes:null,completionEvidenceIds:[],completedAt:null};
     }else if(body.action==='OBJECT_UNILATERAL_TERMINATION'){if(!body.reason)throw Error('Missing objection');state='OBJECTED';notice.objectionReason=body.reason;}
     else if(body.action==='FINALIZE_UNILATERAL_TERMINATION'){const v=body.unilateralCompletion;if(!v.possessionRecovered||!v.accountsReviewed||!v.conditionNotes||v.evidenceIds.length!==1)throw Error('Missing recovery evidence/acknowledgements');state='COMPLETED';notice.completionNotes=v.conditionNotes;notice.completionEvidenceIds=v.evidenceIds;notice.completedAt='2026-11-22T00:00:00Z';}
     else throw Error('Unexpected action '+body.action);version++;return json(data());
    }
    unknown.push(path);return route.fulfill({status:404,json:{message:'Unexpected API'}});
   });
   await p.goto(baseURL+'/contracts/42');await p.getByRole('button',{name:'Kết thúc thuê / bàn giao cư trú',exact:true}).click();
   const panel=p.getByRole('region',{name:'Kết thúc khi người thuê mất liên lạc'});await panel.waitFor();
   const action=mode==='propose'?'Gửi thông báo chờ 30 ngày':mode==='object'?'Phản đối kết thúc đơn phương':'Xác nhận thu hồi phòng và kết thúc';
   await panel.getByRole('button',{name:action,exact:true}).click();let form=panel.getByRole('form',{name:'Xử lý kết thúc đơn phương'});
   const fill=async(reuse=false)=>{
    if(mode==='propose'){await form.getByLabel('Lý do người thuê mất liên lạc',{exact:true}).fill('Không liên lạc được, đã rời phòng.');await form.getByLabel('Căn cứ / điều khoản hợp đồng để kết thúc',{exact:true}).fill('Điều khoản báo trước và chấm dứt đã ký.');}
    else if(mode==='object')await form.getByLabel('Nội dung phản đối',{exact:true}).fill('Tôi vẫn đang thuê và không đồng ý.');
    else{
     if(!await form.getByRole('button',{name:'Xác nhận',exact:true}).isDisabled())throw Error('Missing recovery gate');
     await form.getByLabel('Tôi xác nhận đã thu hồi thực tế phòng và chìa khóa, có thể cho thuê lại.',{exact:true}).check();
     await form.getByLabel('Tôi đã đối chiếu chỉ số điện nước và các khoản phải thu; thao tác này không xóa nợ hoặc tự hoàn tiền cọc.',{exact:true}).check();
     await form.getByLabel('Tình trạng phòng và ghi nhận thu hồi',{exact:true}).fill('Đã thu hồi phòng và kiểm tra hiện trạng.');
     if(!reuse)await form.locator('input[type=file]').setInputFiles({name:'recovery.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7i8AAAAASUVORK5CYII=','base64')});
     await form.getByLabel('Chứng cứ thu hồi 1',{exact:true}).check();
    }
    await form.getByLabel('Tôi đã kiểm tra thông tin và xác nhận thao tác này.',{exact:true}).check();
   };
   await fill();await form.getByRole('button',{name:'Xác nhận',exact:true}).click();
   if(mode==='finalize'&&width===390){
    await panel.getByRole('alert').filter({hasText:'Thông báo đã thay đổi'}).waitFor();if(writes!==1||state!=='PENDING')throw Error('Stale request retried');
    await panel.getByRole('button',{name:'Tải lại trạng thái trước khi xác nhận',exact:true}).click();await panel.getByRole('button',{name:action,exact:true}).click();form=panel.getByRole('form',{name:'Xử lý kết thúc đơn phương'});await fill(true);
    if(screenshot)await p.screenshot({path:screenshot,fullPage:true});await form.getByRole('button',{name:'Xác nhận',exact:true}).click();
   }
   if(mode==='propose'){await panel.getByText('Đang chờ phản hồi.',{exact:false}).waitFor();if(await panel.getByRole('button',{name:'Xác nhận thu hồi phòng và kết thúc',exact:true}).count())throw Error('Premature finalize');}
   else if(mode==='object'){await panel.getByText('Người thuê đã phản đối:',{exact:false}).waitFor();if(await panel.getByRole('button',{name:'Xác nhận thu hồi phòng và kết thúc',exact:true}).count())throw Error('Objection did not block');}
   else await panel.getByText('Chủ nhà đã xác nhận thu hồi phòng và kết thúc đơn phương',{exact:false}).waitFor();
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
   if(errors.length||unknown.length)throw Error(JSON.stringify({errors,unknown}));results.push({width,mode,state,writes,uploads,staleRecovered:staleUsed});
  }finally{await ctx.close();}
 }
 return results;
};
test('Unilateral notice, tenant objection and recovery at desktop/mobile',async({page,baseURL})=>{test.setTimeout(120000);await scenario(page,baseURL??'http://localhost:3000',readFileSync('../../ancu-proptech-backend/target/compact-contract.pdf'));});

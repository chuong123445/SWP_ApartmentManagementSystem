import type {SelectionCancellation} from '@/services/rental/selectionCancellationService';
import type {LeaseRequestResult,ResultEvent} from '@/services/contract/contractTerminationResults';
export function resultActorRole(event:{actorId:string;before?:unknown;after?:unknown},ownerId?:string):ResultEvent['actorRole']{
 if(event.actorId==='0')return 'SYSTEM';const after=event.after as Record<string,unknown>|undefined,before=event.before as Record<string,unknown>|undefined;return event.actorId===String(ownerId??after?.ownerId??before?.ownerId)?'OWNER':'CUSTOMER';
}
export function cancellationResult(data:SelectionCancellation|null):LeaseRequestResult|null{
 const event=data?.history.at(-1);if(!data||data.state==='NONE'||!event)return null;
 return {id:data.requestId,kind:'CANCELLATION',state:data.state,event:{...event,actorRole:resultActorRole(event)},proposalReason:data.reason};
}
export function resultStateLabel(result:LeaseRequestResult){const subject=result.kind==='CANCELLATION'?'Đề nghị dừng làm hợp đồng':'Đề nghị kết thúc thuê sớm';return subject+' '+({PENDING:'đang chờ phản hồi',AGREED:'đã được chấp thuận',CANCELLED:'đã được chấp thuận',REJECTED:'đã bị từ chối',WITHDRAWN:'đã được rút'}[result.state]??'đã được cập nhật');}
export function resultActionLabel(action:string){return ({PROPOSED:'Gửi đề nghị dừng làm hợp đồng',ACCEPTED:'Đồng ý dừng làm hợp đồng',REJECTED:'Từ chối dừng làm hợp đồng',WITHDRAWN:'Rút đề nghị dừng làm hợp đồng',AUTO_ACCEPTED:'Hệ thống tự chấp thuận dừng làm hợp đồng',DIRECT_CANCELLED:'Dừng làm hợp đồng (hồ sơ cũ)',PROPOSE_TERMINATION:'Gửi đề nghị kết thúc thuê sớm',ACCEPT_TERMINATION:'Đồng ý kết thúc thuê sớm',REJECT_TERMINATION:'Từ chối kết thúc thuê sớm',WITHDRAW_TERMINATION:'Rút đề nghị kết thúc thuê sớm'} as Record<string,string>)[action]??action;}

export function shouldShowLeaseResult(result:LeaseRequestResult,viewerId?:string):boolean {
 const isResponse=['ACCEPT_TERMINATION','REJECT_TERMINATION','ACCEPTED','REJECTED'].includes(result.event.action);
 return !isResponse||!viewerId||result.event.actorId!==viewerId;
}

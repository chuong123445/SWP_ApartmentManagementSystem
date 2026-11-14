import type {ContractExit} from '../../src/services/contract/contractExitService';
export function exitFixture(id:string,ownerId:string,customerId:string):ContractExit{
 return {document:null,signing:null,canSign:false,contractId:id,contractStatus:'ACTIVE',ownerId,customerId,today:'2026-11-08',startDate:'2025-01-01',endDate:'2026-10-31',sourceVersion:'c'.repeat(64),terminationState:'NONE',termination:null,handoverState:'NONE',handover:null,canProposeTermination:false,canRespondTermination:false,canWithdrawTermination:false,canProposeHandover:true,canConfirmHandover:false,canDisputeHandover:false,canCancelHandover:false,evidence:[],history:[]};
}
export function proposedHandover(value:ContractExit,input:any){
 value.handoverState='PENDING';value.canProposeHandover=false;value.canCancelHandover=true;
 value.handover={...input,electricityStartReading:'200',waterStartReading:'50',electricityReading:String(input.electricityReading),waterReading:String(input.waterReading),utilityAmount:'127500',disputeReason:null,disputedBy:null,disputeEvidenceIds:[]};
}

import type { Dossier, DossierSubmit, EvidenceFile, EvidencePurpose } from '@/types/dossier';
import type { PropertyCreateInput, PropertyUnitInput } from '@/types/property';
export const legalFields=[['principalName','Họ tên chủ sở hữu gốc'],['principalDocumentNumber','CCCD chủ sở hữu gốc'],['rightsValidFrom','Quyền cho thuê từ ngày'],['rightsValidUntil','Quyền cho thuê đến hết ngày'],['originalLeaseFrom','Hợp đồng thuê gốc từ ngày'],['originalLeaseUntil','Hợp đồng thuê gốc đến hết ngày'],['certificateNumber','Số giấy chứng nhận'],['certificateIssueDate','Ngày cấp giấy chứng nhận'],['certificateIssuePlace','Nơi cấp giấy chứng nhận']] as const;
export type LegalKey=typeof legalFields[number][0];
export interface Suggestion { field:string;value:string;fileId:string;filename:string;page?:number|null }
export interface WizardUnit extends PropertyUnitInput { key:string;selected:boolean;imageIds:string[];amenitiesText?:string }
export interface ListingState { step:number;confirmed:boolean;name:string;address:string;city:string;district:string;ward:string;rentalMode:'SINGLE_UNIT'|'MULTI_UNIT';imageIds:string[];units:WizardUnit[];legal:Record<LegalKey,string>;excludedFiles:string[];suggestions:Suggestion[] }
export const blankListingUnit=():WizardUnit=>({key:crypto.randomUUID(),selected:true,imageIds:[],roomNumber:'',title:'',description:'',floor:0,areaM2:'',advertisedMonthlyRent:'',deposit:null,bedrooms:null,bathrooms:null,maxOccupants:null,electricityIndex:null,waterIndex:null,electricityUnitPrice:null,waterUnitPrice:null,amenities:[]});
export const blankListing=():ListingState=>({step:0,confirmed:false,name:'',address:'',city:'',district:'',ward:'',rentalMode:'SINGLE_UNIT',imageIds:[],units:[blankListingUnit()],legal:Object.fromEntries(legalFields.map(([key])=>[key,''])) as Record<LegalKey,string>,excludedFiles:[],suggestions:[]});
export function restoreListing(payload:unknown):ListingState {
 const initial=blankListing();
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return initial;
 const data=payload as Partial<ListingState>;
 const result={...initial};
 for(const key of ['name','address','city','district','ward'] as const)if(typeof data[key]==='string')result[key]=data[key];
 result.step=Number.isInteger(data.step)?Math.max(0,Math.min(4,data.step!)):0;
 result.confirmed=data.confirmed===true;
 result.rentalMode=data.rentalMode==='MULTI_UNIT'?'MULTI_UNIT':'SINGLE_UNIT';
 result.imageIds=Array.isArray(data.imageIds)?data.imageIds.filter(id=>typeof id==='string').slice(0,4):[];
 result.excludedFiles=Array.isArray(data.excludedFiles)?data.excludedFiles.filter(id=>typeof id==='string'):[];
 for(const [key] of legalFields)if(typeof data.legal?.[key]==='string')result.legal[key]=data.legal[key];
 if(Array.isArray(data.units)&&data.units.length){
  result.units=data.units.filter(unit=>unit&&typeof unit==='object').slice(0,50).map(unit=>{
   const restored={...blankListingUnit(),...unit};
   restored.key=typeof unit.key==='string'?unit.key:crypto.randomUUID();
   restored.imageIds=Array.isArray(unit.imageIds)?unit.imageIds.filter(id=>typeof id==='string').slice(0,4):[];
   restored.amenities=Array.isArray(unit.amenities)?unit.amenities.filter(value=>typeof value==='string'):[];
   return restored;
  });
  if(!result.units.length)result.units=initial.units;
 }
 result.suggestions=Array.isArray(data.suggestions)?data.suggestions.filter(item=>item&&typeof item.field==='string'&&typeof item.value==='string'&&typeof item.fileId==='string'&&typeof item.filename==='string'):[];
 return result;
}
export const requiredEvidence=(right:Dossier['rightType']):EvidencePurpose[]=>right==='AUTHORIZATION'?['RIGHT_DOCUMENT','AUTHORIZATION_DOCUMENT']:right==='SUBLEASE'?['RIGHT_DOCUMENT','ORIGINAL_LEASE','SUBLEASE_CONSENT']:['RIGHT_DOCUMENT'];
export const selectedListingUnits=(state:ListingState)=>state.rentalMode==='SINGLE_UNIT'?state.units.slice(0,1):state.units.filter(u=>u.selected);
export function listingDossier(state:ListingState,files:EvidenceFile[],rightType:Dossier['rightType'],version:number):DossierSubmit{
 const ids=(purpose:EvidencePurpose)=>files.filter(f=>f.purpose===purpose&&!state.excludedFiles.includes(f.id)).map(f=>f.id);
 const legal=Object.fromEntries(Object.entries(state.legal).map(([k,v])=>[k,v.trim()||null]));
 if(rightType==='OWNERSHIP')for(const key of ['principalName','principalDocumentNumber','rightsValidFrom','rightsValidUntil','originalLeaseFrom','originalLeaseUntil'])legal[key]=null;
 if(rightType!=='SUBLEASE'){legal.originalLeaseFrom=null;legal.originalLeaseUntil=null;}
 return {...legal,propertyVersion:version,rightType,documentFileIds:ids('RIGHT_DOCUMENT'),authorizationFileIds:ids('AUTHORIZATION_DOCUMENT'),originalLeaseFileIds:ids('ORIGINAL_LEASE'),subleaseConsentFileIds:ids('SUBLEASE_CONSENT'),supportingFileIds:ids('SUPPORTING'),ownerEvidenceFileIds:ids('OWNER_IDENTITY')};
}
export function listingProperty(state:ListingState):PropertyCreateInput{return {name:state.name.trim(),address:state.address.trim(),city:state.city.trim(),district:state.district.trim(),ward:state.ward.trim()||null,rentalMode:state.rentalMode,imageIds:state.imageIds,apartments:selectedListingUnits(state).map(({key,selected,amenitiesText,...unit})=>({...unit,roomNumber:unit.roomNumber.trim(),title:(unit.title.trim()||`${state.name.trim()} - ${unit.roomNumber.trim()}`).slice(0,150),electricityIndex:null,waterIndex:null}))};}
export function copyCommonTerms(source:WizardUnit,target:WizardUnit):WizardUnit{return {...target,electricityUnitPrice:source.electricityUnitPrice,waterUnitPrice:source.waterUnitPrice,deposit:source.deposit,maxOccupants:source.maxOccupants,amenities:[...source.amenities],amenitiesText:source.amenitiesText};}
export function acceptableSuggestion(field:string,value:string):boolean{
 if(field==='principalDocumentNumber')return /^\d{12}$/.test(value);
 if(/Date$|From$|Until$/.test(field)){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00Z`);return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;}
 return value.trim().length>0&&value.length<=(field==='propertyAddress'?300:field==='certificateIssuePlace'?200:100);
}

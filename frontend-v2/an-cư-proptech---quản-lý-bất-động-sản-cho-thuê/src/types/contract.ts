export interface ContractClause { title: string; body: string }
export interface ContractParty { id: string; fullName: string; email: string; phone: string | null; address: string | null; dateOfBirth: string | null; emailVerified: boolean;
  documentNumber?: string | null; documentIssueDate?: string | null; documentIssuePlace?: string | null; permanentAddress?: string | null; identityVerificationStatus?: string | null; localFixture?: boolean | null }
export interface ContractSnapshot {
  owner: ContractParty; customer: ContractParty;
  asset: { apartmentId: string; propertyId: string; propertyName: string; title: string; roomNumber: string | null; address: string; city: string; district: string; ward: string | null; areaM2: string; floor: number | null; bedrooms: number | null; bathrooms: number | null; amenities: string[]; approvalStatus: string; approvedDossierId: string | null; exploitationRight: string | null;
    certificateNumber?: string | null; certificateIssueDate?: string | null; certificateIssuePlace?: string | null; exploitationRightDescription?: string | null; localFixture?: boolean | null };
  receivingAccount: { bank: string; accountNumber: string; accountHolderName: string } | null;
}
export interface ContractTerms {
  templateType?: 'APARTMENT' | 'HOUSE' | 'ROOM' | 'BUSINESS' | 'SHARED';
  startDate: string; endDate: string; monthlyRent: string; electricityUnitPrice: string; waterUnitPrice: string; deposit: string;
  paymentDay: number; paymentMethod: string; usagePurpose: string; clauses: ContractClause[];
}
export interface ContractDraft extends ContractTerms {
  id: string; rentalRequestId: string; contractNumber: string; status: 'DRAFT' | 'ACTIVE' | 'ENDED'; version: number; snapshot: ContractSnapshot; createdAt: string;
  signing?: ContractSigning;
  lifecycle?: ContractLifecycle;
}
export interface ContractHandover {
  id: string; version: number; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; returnDate: string;
  electricityReading: string; waterReading: string; keysReturned: boolean; conditionNotes: string;
  electricityStartReading?: string | null; waterStartReading?: string | null;
  depositAmount: string; deductionAmount: string; utilityAmount: string; refundAmount: string; extraAmountDue: string;
  ownerConfirmedAt: string; customerConfirmedAt: string | null;
}
export interface ContractLifecycle {
  version: number; expired: boolean; previousContractId: string | null; renewalContractId: string | null;
  endReason: string | null; handover: ContractHandover | null;
}
export interface HandoverInput {
  version: number; returnDate: string; electricityReading: string; waterReading: string;
  keysReturned: boolean; conditionNotes: string; deductionAmount: string; consent: boolean;
  electricityStartReading?: string; waterStartReading?: string;
}
export interface ContractSigning {
  ownerAccountId: string; customerAccountId: string; contentHash: string;
  state: 'UNSIGNED' | 'WAITING_OWNER' | 'WAITING_CUSTOMER' | 'SIGNED';
  ownerSignedAt: string | null; customerSignedAt: string | null;
  ownerSignature: string | null; customerSignature: string | null;
}
export interface ContractContext {
  suggestedRates?: {electricityUnitPrice:string|null;waterUnitPrice:string|null;internetFee:string;garbageFee:string}|null;
  rightsValidFrom?: string|null; rightsValidUntil?: string|null;
  rentalRequestId: string; requestVersion: number; sourceVersion: string; snapshot: ContractSnapshot; advertisedMonthlyRent: string;
  suggestedDeposit: string | null; templateClauses: ContractClause[]; existingDraft: ContractDraft | null;
}

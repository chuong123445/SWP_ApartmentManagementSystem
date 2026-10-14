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
  startDate: string; endDate: string; monthlyRent: string; electricityUnitPrice: string; waterUnitPrice: string; deposit: string;
  paymentDay: number; paymentMethod: string; usagePurpose: string; clauses: ContractClause[];
}
export interface ContractDraft extends ContractTerms {
  id: string; rentalRequestId: string; contractNumber: string; status: 'DRAFT' | 'ACTIVE' | 'ENDED'; version: number; snapshot: ContractSnapshot; createdAt: string;
}
export interface ContractContext {
  rentalRequestId: string; requestVersion: number; sourceVersion: string; snapshot: ContractSnapshot; advertisedMonthlyRent: string;
  suggestedDeposit: string | null; templateClauses: ContractClause[]; existingDraft: ContractDraft | null;
}

export interface IdentityFields {
  legalName: string;
  documentNumber: string;
  dateOfBirth: string;
  issueDate: string;
  issuePlace: string;
  permanentAddress: string;
  currentAddress: string;
}
export interface IdentityProfile extends IdentityFields {
  verificationStatus: 'NOT_VERIFIED';
  updatedAt: string;
  version: number;
  localFixture?: boolean;
}

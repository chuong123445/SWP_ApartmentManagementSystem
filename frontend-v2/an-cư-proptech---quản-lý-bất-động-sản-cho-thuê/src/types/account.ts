export interface AccountProfile {
  id: string; email: string; phone: string | null; fullName: string; dateOfBirth: string | null;
  address: string | null; bio: string | null; roles: string[]; accountStatus: string;
  contactVerificationStatus: string; emailVerified: boolean; phoneVerified: boolean;
  emailOtpAvailable: boolean; version: number;
}
export interface EmailChallenge { id: string; destinationHint: string; expiresAt: string; status: 'PENDING' | 'USED' | 'INVALIDATED' | 'EXPIRED' }

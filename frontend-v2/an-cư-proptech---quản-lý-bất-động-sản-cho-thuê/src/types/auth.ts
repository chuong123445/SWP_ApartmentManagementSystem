export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: ('OWNER' | 'ADMIN' | 'CUSTOMER')[];
  accountStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'INACTIVE';
  contactVerificationStatus: 'VERIFIED' | 'UNVERIFIED';
  version: number;
}
export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}


export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  error: string;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  loginVneid: (token: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  endSession: () => void;
}

import { createContext, useContext } from 'react';
import type { VneidConfig } from '@/services/auth/vneidService';
export const VneidContext = createContext<{ config: VneidConfig | null; loading: boolean; error: string }>({ config: null, loading: true, error: '' });
export const useVneidConfig = () => useContext(VneidContext);

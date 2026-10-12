import { createContext, useContext } from 'react';
import type { Tenancy } from '@/types/billing';
export const TenancyContext = createContext<{ tenancies: Tenancy[]; loading: boolean; error: string }>({ tenancies: [], loading: false, error: '' });
export function useTenancyContext() { return useContext(TenancyContext); }

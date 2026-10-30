import { createContext, useContext } from 'react';
import type { Tenancy } from '@/types/billing';
export const TenancyContext = createContext<{ tenancies: Tenancy[]; loading: boolean; error: string; reload:()=>void }>({ tenancies: [], loading: false, error: '', reload:()=>{} });
export function useTenancyContext() { return useContext(TenancyContext); }

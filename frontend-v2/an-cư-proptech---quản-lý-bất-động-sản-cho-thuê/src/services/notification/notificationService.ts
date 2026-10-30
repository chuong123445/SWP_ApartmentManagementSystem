import {apiFetch,readApiError} from '@/services/http/client';
export interface NotificationItem {id:string;title:string;message:string;url:string;createdAt:string;read:boolean}
export interface NotificationFeed {items:NotificationItem[];page:number;size:number;totalElements:number;totalPages:number;unreadCount:number;snapshotAt:string}
export async function getNotifications(page=0):Promise<NotificationFeed>{const r=await apiFetch('/api/v1/me/notifications?page='+page+'&size=20',{cache:'no-store'});if(!r.ok)throw await readApiError(r);return r.json();}
export async function markNotificationRead(id:string){const r=await apiFetch('/api/v1/me/notifications/'+encodeURIComponent(id)+'/read',{method:'POST'});if(!r.ok)throw await readApiError(r);}
export async function markAllNotificationsRead(through:string){const r=await apiFetch('/api/v1/me/notifications/read-all',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({through})});if(!r.ok)throw await readApiError(r);}

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

// Every run uses fresh accounts/property and guarded cleanup; never demo data.
test('isolated decisions persist reasons, refresh Owner inventory and update open Customer pages', async ({ page, browser }) => {
  test.setTimeout(70000);
  const key=randomUUID(), propertyId=randomUUID(), name=`Rental E2E ${key}`, password=`Rental-test-${randomUUID()}!`;
  const ownerEmail=`rental-e2e-${key}-owner@example.invalid`, customerEmail=`rental-e2e-${key}-customer@example.invalid`;
  let ownerId='00000000-0000-0000-0000-000000000000', customerId=ownerId;
  const ownerContext=await browser.newContext({baseURL:test.info().project.use.baseURL});const ownerPage=await ownerContext.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));ownerPage.on('pageerror',e=>errors.push(e.message));
  const manifestDirectory=resolve('../../ancu-proptech-backend/target/rental-e2e-fixtures');mkdirSync(manifestDirectory,{recursive:true});const manifest=resolve(manifestDirectory,`${key}.json`);
  const saveManifest=()=>writeFileSync(manifest,JSON.stringify({key,ownerId,customerId,propertyId}));saveManifest();
  const localFixture=(mode:'prepare'|'cleanup')=>{
    const result=spawnSync('powershell.exe',['-NoProfile','-File',resolve('../../ancu-proptech-backend/tools/rental-e2e-fixture.ps1'),'-Mode',mode,'-TestKey',key,'-OwnerId',ownerId,'-CustomerId',customerId,'-PropertyId',propertyId],{encoding:'utf8'});
    if(result.status!==0)throw new Error(`Isolated fixture ${mode} failed: ${result.stderr}`);
    return JSON.parse(result.stdout.trim());
  };
  const register=async(role:'OWNER'|'CUSTOMER',email:string)=>{
    const csrf=await(await page.request.get('/api/v1/auth/csrf')).json();
    const response=await page.request.post('/api/v1/auth/register',{headers:{[csrf.headerName]:csrf.token},data:{email,password,fullName:name,requestedRole:role}});
    expect(response.status()).toBe(201);return (await response.json()).id;
  };
  const login=async(p:Page,email:string)=>{
    await p.goto('/login');await p.locator('#login-email').fill(email);await p.locator('#login-password').fill(password);
    const response=p.waitForResponse(r=>r.url().endsWith('/api/v1/auth/login')&&r.request().method()==='POST');await p.locator('button[type=submit]').click();
    const body=await(await response).json();await expect(p.getByRole('button',{name:'Vai trò và tài khoản'})).toBeVisible();return {Authorization:`Bearer ${body.accessToken}`};
  };
  try {
    ownerId=await register('OWNER',ownerEmail);saveManifest();customerId=await register('CUSTOMER',customerEmail);saveManifest();expect(localFixture('prepare').prepared).toBe(true);
    const ownerHeaders=await login(ownerPage,ownerEmail);
    const created=await ownerPage.request.post('/api/v1/owner/apartments',{headers:ownerHeaders,data:{propertyId,roomNumber:'E2E.101',title:name,description:'Isolated decision test',floor:1,areaM2:'30',advertisedMonthlyRent:'5000000',maxOccupants:2,bedrooms:1,bathrooms:1,amenities:[],publicationStatus:'PUBLISHED'}});
    expect(created.status()).toBe(201);const apartment=await created.json();
    await ownerPage.reload();await ownerPage.locator('#nav-rooms').click();const card=ownerPage.locator('#room-card-e2e101');await expect(card).toContainText('Căn hộ trống');
    const customerHeaders=await login(page,customerEmail);
    const submit=async(message:string)=>{const response=await page.request.post(`/api/v1/apartments/${apartment.id}/rental-requests`,{headers:customerHeaders,data:{message}});expect(response.status()).toBe(201);return response.json();};
    const rejected=await submit('First isolated request');
    await page.goto('/my/rental-requests');const customerRejected=page.getByTestId('rental-request').filter({hasText:'First isolated request'});await expect(customerRejected).toContainText('Chờ xử lý');
    await ownerPage.locator('#nav-rental_requests').click();const ownerRejected=ownerPage.getByTestId('rental-request').filter({hasText:'First isolated request'});await expect(ownerRejected).toBeVisible();
    await ownerRejected.getByRole('button',{name:'Từ chối',exact:true}).click();const dialog=ownerPage.getByRole('dialog',{name:'Từ chối yêu cầu thuê'});await dialog.getByLabel('Lý do từ chối (không bắt buộc)').fill('Không phù hợp thời gian thuê');await ownerPage.setViewportSize({width:390,height:844});await dialog.screenshot({path:'test-results/visual/rental-rework-reject-dialog-mobile.png'});await dialog.getByRole('button',{name:'Xác nhận từ chối',exact:true}).click();await ownerPage.setViewportSize({width:1440,height:1000});
    await expect(ownerRejected).toContainText('Không phù hợp thời gian thuê');
    await expect(customerRejected).toContainText('Đã từ chối',{timeout:16000});await expect(customerRejected).toContainText('Không phù hợp thời gian thuê');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/visual/rental-rework-customer-reason-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
    await ownerPage.locator('#nav-rooms').click();await expect(card).toContainText('Căn hộ trống');
    const accepted=await submit('Second isolated request');
    await ownerPage.locator('#nav-rental_requests').click();const ownerAccepted=ownerPage.getByTestId('rental-request').filter({hasText:'Second isolated request'});await expect(ownerAccepted).toBeVisible();
    await expect(ownerPage.getByTestId('rental-request').first()).toContainText('Second isolated request');
    await page.goto(`/apartments/${apartment.id}`);await expect(page.getByText('Đã gửi yêu cầu thuê',{exact:true})).toBeVisible();
    await ownerAccepted.getByRole('button',{name:'Đồng ý',exact:true}).click();await expect(ownerAccepted).toContainText('Đã chấp nhận');await expect(ownerAccepted.getByRole('button',{name:'Tạo hợp đồng',exact:true})).toBeDisabled();
    await expect(page.getByText('Chủ nhà đã chấp nhận yêu cầu thuê.',{exact:true})).toBeVisible({timeout:16000});await expect(page.getByRole('button',{name:'Hủy yêu cầu thuê',exact:true})).toHaveCount(0);
    await ownerPage.locator('#nav-rooms').click();await expect(card).toContainText('Đang làm hợp đồng');
    await page.goto('/my/rental-requests');await expect(page.getByTestId('rental-request').filter({hasText:'First isolated request'})).toContainText('Không phù hợp thời gian thuê');
    await ownerPage.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();const box=await card.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(390);await ownerPage.screenshot({path:'test-results/visual/rental-rework-owner-mobile.png',fullPage:true});
    const history=await(await page.request.get('/api/v1/me/rental-requests',{headers:customerHeaders})).json();expect(history.items.find((r:any)=>r.id===rejected.id).decisionReason).toBe('Không phù hợp thời gian thuê');expect(history.items.find((r:any)=>r.id===accepted.id).status).toBe('ACCEPTED');expect(errors).toEqual([]);
  } finally {
    try { await ownerContext.close(); } finally { const result=localFixture('cleanup');expect(result.accountsRemaining).toBe(0);expect(result.propertiesRemaining).toBe(0);unlinkSync(manifest); }
  }
});

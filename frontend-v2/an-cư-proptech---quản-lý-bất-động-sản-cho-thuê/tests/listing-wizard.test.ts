import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptableSuggestion,blankListing,blankListingUnit,copyCommonTerms,listingDossier,listingProperty,selectedListingUnits } from '../src/utils/listingWizard';

test('only selected rooms become commands and UI state stays private',()=>{
 const state=blankListing();state.rentalMode='MULTI_UNIT';state.units=[blankListingUnit(),blankListingUnit()];state.units[1].selected=false;
 state.units[0].roomNumber='P101';state.units[0].amenitiesText='Wifi, Bếp';
 assert.equal(selectedListingUnits(state).length,1);
 const command=listingProperty(state);assert.equal(command.apartments.length,1);assert.equal(command.apartments[0].electricityIndex,null);
 assert.equal('key' in command.apartments[0],false);assert.equal('amenitiesText' in command.apartments[0],false);
});
test('copying shared terms preserves room-specific price area and photos',()=>{
 const source={...blankListingUnit(),advertisedMonthlyRent:'5000000',areaM2:'30',electricityUnitPrice:'3500',amenities:['Wifi']};
 const target={...blankListingUnit(),advertisedMonthlyRent:'4000000',areaM2:'24',imageIds:['7']};
 const copied=copyCommonTerms(source,target);assert.equal(copied.areaM2,'24');assert.equal(copied.advertisedMonthlyRent,'4000000');assert.deepEqual(copied.imageIds,['7']);assert.equal(copied.electricityUnitPrice,'3500');
});
test('AI suggestions reject impossible dates and preserve leading identity zeroes',()=>{
 assert.equal(acceptableSuggestion('rightsValidUntil','2026-02-30'),false);assert.equal(acceptableSuggestion('rightsValidUntil','2028-02-29'),true);
 assert.equal(acceptableSuggestion('principalDocumentNumber','001234567890'),true);assert.equal(acceptableSuggestion('principalDocumentNumber','1234567890'),false);
});
test('dossier references exclude removed evidence and ownership has no authorization dates',()=>{
 const state=blankListing();state.legal.rightsValidFrom='2026-01-01';state.excludedFiles=['2'];
 const files=[{id:'1',purpose:'RIGHT_DOCUMENT' as const,filename:'a.pdf',contentType:'application/pdf',size:1},{id:'2',purpose:'RIGHT_DOCUMENT' as const,filename:'b.pdf',contentType:'application/pdf',size:1}];
 const input=listingDossier(state,files,'OWNERSHIP',3);assert.deepEqual(input.documentFileIds,['1']);assert.equal(input.rightsValidFrom,null);assert.equal('receivingAccount' in input,false);
});

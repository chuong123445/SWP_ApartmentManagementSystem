package com.ancu.proptech.service.property;

import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;

@Service @RequiredArgsConstructor
public class VneidPropertyImportService {
    private final PropertyApplicantAccess applicants;
    private final PropertySourceConsentService consents;
    private final AuthAccountRepository accounts;
    private final ExternalIdentityRepository identities;
    private final Auth0AssetReader assets;
    private final PropertyExternalImportRepository imports;
    private final PropertySourceUnitRepository sourceUnits;
    private final PropertySourceImportBatchRepository batches;
    private final PropertyRepository properties;
    private final ApartmentRepository apartments;
    private final OwnerPropertyService propertyService;
    private final PropertyImageService images;
    private final com.ancu.proptech.service.apartment.OwnerApartmentService apartmentService;
    private final TransactionTemplate transactions;
    private final EntityManager em;
    private final ObjectMapper json;
    private record Binding(Long accountId,String issuer,String subject) {}
    public record UnitState(String externalUnitId,String apartmentId,String publicationStatus) {}
    public record Candidate(VneidAsset asset,String sourceVersion,boolean imported,String propertyId,Long propertyVersion,
                            List<UnitState> unitStates,String appendBlockedReason) {}

    public List<Candidate> list(Jwt jwt) {
        Binding binding=transactions.execute(status->binding(jwt));
        var current=assets.assetDetails(binding.issuer(),binding.subject());
        return transactions.execute(status->{
            recheck(jwt,binding);
            return current.stream().filter(this::importable).map(a->candidate(a,binding)).toList();
        });
    }

    private Candidate candidate(VneidAsset asset,Binding binding) {
        var evidence=imports.findByIssuerAndExternalAssetId(binding.issuer(),asset.externalAssetId()).orElse(null);
        if(evidence==null)return new Candidate(asset,hash(asset),false,null,null,List.of(),null);
        var p=properties.findById(evidence.getPropertyId()).orElseThrow();
        if(!p.getOwner().getId().equals(binding.accountId())||!evidence.getSubject().equals(binding.subject()))
            return new Candidate(asset,hash(asset),true,null,null,List.of(),"ASSET_ALREADY_IMPORTED");
        var local=apartments.findByPropertyIdOrderByIdAsc(p.getId());var mapped=sourceUnits.findByPropertyId(p.getId());
        var state=mapped.stream().map(m->{var a=local.stream().filter(u->u.getId().equals(m.getApartmentId())).findFirst().orElseThrow();
            return new UnitState(m.getExternalUnitId(),a.getId().toString(),a.getPublicationStatus().name());}).toList();
        String blocked=local.isEmpty()||mapped.size()!=local.size()?"SOURCE_UNIT_RECONCILIATION_REQUIRED":legalMatches(evidence,asset)?null:"ASSET_LEGAL_SOURCE_CHANGED";
        if(p.getApprovalStatus()!=Property.ApprovalStatus.APPROVED||p.getRightType()!=PropertyDossier.RightType.OWNERSHIP)blocked="SOURCE_PROPERTY_NOT_ELIGIBLE";
        return new Candidate(asset,hash(asset),true,p.getId().toString(),p.getVersion(),state,blocked);
    }

    public OwnerPropertyCreated importProperty(Jwt jwt,VneidPropertyImportRequest input) {
        Binding binding=transactions.execute(status->binding(jwt));
        // Không giữ khóa SQL trong khi gọi Auth0; không nhận thông tin sở hữu từ client.
        var source=assets.assetDetails(binding.issuer(),binding.subject()).stream()
            .filter(a->a.externalAssetId().equals(input.getExternalAssetId())&&importable(a)).findFirst()
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"ASSET_NOT_AVAILABLE","Tài sản không còn thuộc danh sách VNeID hợp lệ của bạn."));
        if(!hash(source).equals(input.getSourceVersion()))throw error(HttpStatus.CONFLICT,"ASSET_SOURCE_CHANGED","Thông tin tài sản đã thay đổi. Hãy tải lại danh sách.");
        return transactions.execute(status->{
            recheck(jwt,binding);
            if(imports.existsByIssuerAndExternalAssetId(binding.issuer(),source.externalAssetId()))
                throw error(HttpStatus.CONFLICT,"ASSET_ALREADY_IMPORTED","Tài sản đã được thêm vào hệ thống.");
            var terms=SourceRoomSelection.terms(source,input.getUnits(),Set.of());
            var create=new OwnerPropertyCreate();create.setImageIds(input.getImageIds());create.setName(source.name());create.setAddress(source.address());
            create.setCity(input.getCity().strip());create.setDistrict(input.getDistrict().strip());create.setWard(input.getWard());
            create.setRentalMode(Property.RentalMode.valueOf(source.rentalMode()));
            create.setApartments(source.units().stream().filter(unit->terms.containsKey(unit.externalUnitId())).map(unit->{
                var t=terms.get(unit.externalUnitId());var u=new OwnerPropertyCreate.Unit();u.setImageIds(t.getImageIds());
                u.setRoomNumber(unit.code());u.setTitle(unit.code()+" · "+source.name());if(u.getTitle().length()>150)u.setTitle(source.name());
                u.setAreaM2(unit.areaM2());u.setBedrooms(unit.bedrooms());u.setBathrooms(unit.bathrooms());u.setFloor(t.getFloor());
                u.setMaxOccupants(t.getMaxOccupants());u.setDescription(t.getDescription());u.setAdvertisedMonthlyRent(t.getMonthlyRent());
                u.setDeposit(t.getDeposit());u.setElectricityIndex(t.getElectricityIndex());u.setWaterIndex(t.getWaterIndex());return u;
            }).toList());
            var created=propertyService.createSource(jwt,create);
            var property=properties.findById(created.property().id()).orElseThrow();
            // User cho phép tài sản nguồn Auth0 bỏ Admin; không tạo bản ghi Admin duyệt giả.
            property.setApprovalStatus(Property.ApprovalStatus.APPROVED);
            property.setOnboardingApplication(false);
            property.setRightType(PropertyDossier.RightType.OWNERSHIP);
            for(var createdUnit:created.apartments()) {
                var unit=apartments.findById(createdUnit.id()).orElseThrow();
                var sourceUnit=source.units().stream().filter(u->u.code().equals(unit.getRoomNumber())).findFirst().orElseThrow();
                var t=terms.get(sourceUnit.externalUnitId());unit.setElectricityUnitPrice(t.getElectricityUnitPrice().setScale(2));unit.setWaterUnitPrice(t.getWaterUnitPrice().setScale(2));
                unit.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
            }
            var evidence=new PropertyExternalImport();evidence.setPropertyId(property.getId());evidence.setIssuer(binding.issuer());evidence.setSubject(binding.subject());
            evidence.setExternalAssetId(source.externalAssetId());evidence.setSource(VneidTokenVerifier.SOURCE);evidence.setSourceVersion(hash(source));
            evidence.setSourceSnapshot(json.writeValueAsString(source));evidence.setImportedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));imports.saveAndFlush(evidence);apartments.flush();properties.flush();
            recordSelection(property.getId(),source,terms.keySet());
            // Mọi dữ liệu/ảnh/giá đã hợp lệ và lưu trong cùng transaction mới cấp quyền.
            var account=accounts.findById(binding.accountId()).orElseThrow();
            if(account.hasRole(com.ancu.proptech.model.auth.AuthAccount.Role.CUSTOMER)){account.grantRole(com.ancu.proptech.model.auth.AuthAccount.Role.OWNER);accounts.flush();}
            return new OwnerPropertyCreated(propertyService.list(jwt).stream().filter(p->p.id().equals(property.getId())).findFirst().orElseThrow(),
                apartmentService.list(jwt).stream().filter(a->a.propertyId().equals(property.getId())).toList());
        });
    }

    public OwnerPropertyCreated appendUnits(Jwt jwt,Long propertyId,VneidUnitsAppendRequest input) {
        Binding binding=transactions.execute(status->{var b=binding(jwt);ownedSource(propertyId,b);return b;});
        String assetId=transactions.execute(status->ownedSource(propertyId,binding).getExternalAssetId());
        var source=assets.assetDetails(binding.issuer(),binding.subject()).stream().filter(a->a.externalAssetId().equals(assetId)&&importable(a)).findFirst()
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"ASSET_NOT_AVAILABLE","Tài sản nguồn không còn thuộc danh tính hiện tại."));
        if(!hash(source).equals(input.getSourceVersion()))throw error(HttpStatus.CONFLICT,"ASSET_SOURCE_CHANGED","Nguồn đã thay đổi. Hãy tải lại danh sách.");
        return transactions.execute(status->{
            recheck(jwt,binding);
            var p=properties.lockById(propertyId).orElseThrow(VneidPropertyImportService::missing);
            em.refresh(p);
            var evidence=ownedSource(propertyId,binding);
            if(p.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"STALE_VERSION","Tài sản đã thay đổi. Hãy tải lại.");
            if(p.getApprovalStatus()!=Property.ApprovalStatus.APPROVED||p.getRightType()!=PropertyDossier.RightType.OWNERSHIP)
                throw error(HttpStatus.CONFLICT,"SOURCE_PROPERTY_NOT_ELIGIBLE","Tài sản nguồn không còn đủ điều kiện bổ sung phòng.");
            if(!legalMatches(evidence,source))throw error(HttpStatus.CONFLICT,"ASSET_LEGAL_SOURCE_CHANGED","Thông tin pháp lý tài sản đã thay đổi. Cần đối chiếu lại trước khi bổ sung phòng.");
            var local=apartments.findByPropertyIdOrderByIdAsc(propertyId);var mapped=sourceUnits.findByPropertyId(propertyId);
            if(local.isEmpty()||mapped.size()!=local.size())throw error(HttpStatus.CONFLICT,"SOURCE_UNIT_RECONCILIATION_REQUIRED","Chưa đối chiếu đủ phòng đã nhập trước đây. Cần kiểm tra dữ liệu nguồn trước khi bổ sung.");
            var terms=SourceRoomSelection.terms(source,input.getUnits(),new HashSet<>(mapped.stream().map(PropertySourceUnit::getExternalUnitId).toList()));
            for(var unit:source.units())if(terms.containsKey(unit.externalUnitId())){
                if(local.stream().anyMatch(a->a.getRoomNumber().strip().equalsIgnoreCase(unit.code().strip())))
                    throw error(HttpStatus.CONFLICT,"SOURCE_ROOM_CODE_CONFLICT","Mã phòng đã có trong tài sản nhưng không khớp mã nguồn. Cần đối chiếu lại.");
                var t=terms.get(unit.externalUnitId());var create=new com.ancu.proptech.dto.apartment.OwnerApartmentCreate();
                create.setPropertyId(propertyId);create.setRoomNumber(unit.code());String title=unit.code()+" · "+p.getName();
                create.setTitle(title.length()>150?p.getName():title);create.setDescription(t.getDescription());create.setAreaM2(unit.areaM2());
                create.setBedrooms(unit.bedrooms());create.setBathrooms(unit.bathrooms());create.setFloor(t.getFloor());create.setMaxOccupants(t.getMaxOccupants());
                create.setAdvertisedMonthlyRent(t.getMonthlyRent());create.setDeposit(t.getDeposit());create.setElectricityIndex(t.getElectricityIndex());create.setWaterIndex(t.getWaterIndex());
                create.setElectricityUnitPrice(t.getElectricityUnitPrice());create.setWaterUnitPrice(t.getWaterUnitPrice());create.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
                var createdUnit=apartmentService.createSourceUnit(jwt,create);
                images.bindUnit(p,createdUnit.id(),t.getImageIds());
            }
            apartments.flush();recordSelection(propertyId,source,terms.keySet());
            return new OwnerPropertyCreated(propertyService.list(jwt).stream().filter(x->x.id().equals(propertyId)).findFirst().orElseThrow(),
                apartmentService.list(jwt).stream().filter(a->a.propertyId().equals(propertyId)).toList());
        });
    }

    private PropertyExternalImport ownedSource(Long propertyId,Binding binding) {
        var p=properties.findById(propertyId).filter(x->x.getOwner().getId().equals(binding.accountId())).orElseThrow(VneidPropertyImportService::missing);
        return imports.findById(p.getId()).filter(x->x.getIssuer().equals(binding.issuer())&&x.getSubject().equals(binding.subject()))
            .orElseThrow(VneidPropertyImportService::missing);
    }
    private boolean legalMatches(PropertyExternalImport saved,VneidAsset current) {
        try{return SourceRoomSelection.sameLegalSource(json.readValue(saved.getSourceSnapshot(),VneidAsset.class),current);}
        catch(RuntimeException e){return false;}
    }
    private void recordSelection(Long propertyId,VneidAsset source,Set<String> selected) {
        var batch=new PropertySourceImportBatch();batch.setPropertyId(propertyId);batch.setSourceVersion(hash(source));
        batch.setSourceSnapshot(json.writeValueAsString(source));batch.setImportedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));batches.saveAndFlush(batch);
        for(var unit:source.units())if(selected.contains(unit.externalUnitId())){
            var apartment=apartments.findByPropertyIdAndRoomNumber(propertyId,unit.code().strip()).orElseThrow();
            var link=new PropertySourceUnit();link.setApartmentId(apartment.getId());link.setPropertyId(propertyId);link.setExternalUnitId(unit.externalUnitId());
            link.setBatchId(batch.getId());link.setImportedAt(batch.getImportedAt());sourceUnits.save(link);
        }
        sourceUnits.flush();
    }
    private static RuntimeException missing(){return error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản nguồn thuộc tài khoản của bạn.");}

    private Binding binding(Jwt jwt){
        var owner=applicants.verified(jwt);
        var identity=identities.findById(owner.getId()).filter(i->"VERIFIED".equals(i.getVerificationStatus()) && "AUTH0_VNEID_SIMULATION".equals(i.getSource()))
            .orElseThrow(()->error(HttpStatus.FORBIDDEN,"VNEID_REQUIRED","Cần căn cước VNeID đã xác thực để chọn tài sản."));
        consents.require(owner,identity);
        return new Binding(owner.getId(),identity.getIssuer(),identity.getSubject());
    }
    private void recheck(Jwt jwt,Binding expected){
        em.clear();accounts.findForIdentityUpdate(expected.accountId()).orElseThrow();
        var identity=identities.findById(expected.accountId()).orElse(null);
        if(identity==null||!identity.getIssuer().equals(expected.issuer())||!identity.getSubject().equals(expected.subject()))throw error(HttpStatus.CONFLICT,"VNEID_LINK_CHANGED","Liên kết VNeID đã thay đổi. Hãy tải lại.");
        var current=binding(jwt);
        if(!current.equals(expected))throw error(HttpStatus.CONFLICT,"VNEID_LINK_CHANGED","Liên kết VNeID đã thay đổi. Hãy tải lại.");
    }
    private boolean importable(VneidAsset a){
        if(a.name().length()>150||a.address().length()>300||a.units().isEmpty()||a.units().size()>50||("SINGLE_UNIT".equals(a.rentalMode())&&a.units().size()!=1))return false;
        var ids=new HashSet<String>();var codes=new HashSet<String>();
        return a.units().stream().allMatch(u->ids.add(u.externalUnitId())&&codes.add(u.code().strip().toLowerCase(Locale.ROOT))&&u.areaM2().scale()<=2&&u.areaM2().compareTo(new BigDecimal("9999999999.99"))<=0);
    }
    private String hash(VneidAsset a){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(a).getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}

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
    private final AccountAccessService access;
    private final AuthAccountRepository accounts;
    private final ExternalIdentityRepository identities;
    private final Auth0AssetReader assets;
    private final PropertyExternalImportRepository imports;
    private final PropertyRepository properties;
    private final ApartmentRepository apartments;
    private final OwnerPropertyService propertyService;
    private final com.ancu.proptech.service.apartment.OwnerApartmentService apartmentService;
    private final TransactionTemplate transactions;
    private final EntityManager em;
    private final ObjectMapper json;
    private record Binding(UUID accountId,String issuer,String subject) {}
    public record Candidate(VneidAsset asset,String sourceVersion,boolean imported) {}

    public List<Candidate> list(Jwt jwt) {
        Binding binding=transactions.execute(status->binding(jwt));
        var current=assets.assetDetails(binding.issuer(),binding.subject());
        return transactions.execute(status->{
            recheck(jwt,binding);
            return current.stream().filter(this::importable).map(a->new Candidate(a,hash(a),imports.existsByIssuerAndExternalAssetId(binding.issuer(),a.externalAssetId()))).toList();
        });
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
            Map<String,VneidPropertyImportRequest.Unit> terms=new HashMap<>();
            for(var unit:input.getUnits())if(terms.put(unit.getExternalUnitId(),unit)!=null)throw invalidUnits();
            if(terms.size()!=source.units().size()||!terms.keySet().equals(new HashSet<>(source.units().stream().map(VneidAsset.Unit::externalUnitId).toList())))throw invalidUnits();
            var create=new OwnerPropertyCreate();create.setName(source.name());create.setAddress(source.address());
            create.setCity(input.getCity().strip());create.setDistrict(input.getDistrict().strip());create.setWard(input.getWard());
            create.setRentalMode(Property.RentalMode.valueOf(source.rentalMode()));
            create.setApartments(source.units().stream().map(unit->{
                var t=terms.get(unit.externalUnitId());var u=new OwnerPropertyCreate.Unit();
                u.setRoomNumber(unit.code());u.setTitle(unit.code()+" · "+source.name());if(u.getTitle().length()>150)u.setTitle(source.name());
                u.setAreaM2(unit.areaM2());u.setBedrooms(unit.bedrooms());u.setBathrooms(unit.bathrooms());u.setFloor(t.getFloor());
                u.setMaxOccupants(t.getMaxOccupants());u.setDescription(t.getDescription());u.setAdvertisedMonthlyRent(t.getMonthlyRent());
                u.setDeposit(t.getDeposit());u.setElectricityIndex(t.getElectricityIndex());u.setWaterIndex(t.getWaterIndex());return u;
            }).toList());
            var created=propertyService.create(jwt,create);
            var property=properties.findById(created.property().id()).orElseThrow();
            // User cho phép tài sản nguồn Auth0 bỏ Admin; không tạo bản ghi Admin duyệt giả.
            property.setApprovalStatus(Property.ApprovalStatus.APPROVED);
            for(var createdUnit:created.apartments()) {
                var unit=apartments.findById(createdUnit.id()).orElseThrow();
                var sourceUnit=source.units().stream().filter(u->u.code().equals(unit.getRoomNumber())).findFirst().orElseThrow();
                var t=terms.get(sourceUnit.externalUnitId());unit.setElectricityUnitPrice(t.getElectricityUnitPrice().setScale(2));unit.setWaterUnitPrice(t.getWaterUnitPrice().setScale(2));
                unit.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);
            }
            var evidence=new PropertyExternalImport();evidence.setPropertyId(property.getId());evidence.setIssuer(binding.issuer());evidence.setSubject(binding.subject());
            evidence.setExternalAssetId(source.externalAssetId());evidence.setSource(VneidTokenVerifier.SOURCE);evidence.setSourceVersion(hash(source));
            evidence.setSourceSnapshot(json.writeValueAsString(source));evidence.setImportedAt(Instant.now());imports.saveAndFlush(evidence);apartments.flush();properties.flush();
            return new OwnerPropertyCreated(propertyService.list(jwt).stream().filter(p->p.id().equals(property.getId())).findFirst().orElseThrow(),
                apartmentService.list(jwt).stream().filter(a->a.propertyId().equals(property.getId())).toList());
        });
    }

    private Binding binding(Jwt jwt){
        var owner=access.owner(jwt);
        var identity=identities.findById(owner.getId()).filter(i->"VERIFIED".equals(i.getVerificationStatus()))
            .orElseThrow(()->error(HttpStatus.FORBIDDEN,"VNEID_REQUIRED","Cần căn cước VNeID đã xác thực để chọn tài sản."));
        return new Binding(owner.getId(),identity.getIssuer(),identity.getSubject());
    }
    private void recheck(Jwt jwt,Binding expected){
        em.clear();accounts.findForIdentityUpdate(expected.accountId()).orElseThrow();
        var current=binding(jwt);
        if(!current.equals(expected))throw error(HttpStatus.CONFLICT,"VNEID_LINK_CHANGED","Liên kết VNeID đã thay đổi. Hãy tải lại.");
    }
    private boolean importable(VneidAsset a){
        if(a.name().length()>150||a.address().length()>300||a.units().isEmpty()||a.units().size()>50||("SINGLE_UNIT".equals(a.rentalMode())&&a.units().size()!=1))return false;
        var ids=new HashSet<String>();var codes=new HashSet<String>();
        return a.units().stream().allMatch(u->ids.add(u.externalUnitId())&&codes.add(u.code().strip().toLowerCase(Locale.ROOT))&&u.areaM2().scale()<=2&&u.areaM2().compareTo(new BigDecimal("9999999999.99"))<=0);
    }
    private String hash(VneidAsset a){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(a).getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static RuntimeException invalidUnits(){return error(HttpStatus.BAD_REQUEST,"ASSET_UNITS_MISMATCH","Cần điền đủ thông tin cho đúng các căn/phòng trong tài sản.");}
}

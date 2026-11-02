package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.apartment.*;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.apartment.OwnerApartmentService;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class AssetManagementService {
    private final AssetManagementAccess access;private final OwnerPropertyService propertyService;
    private final OwnerApartmentService apartmentService;private final PropertyRepository properties;
    private final ApartmentRepository apartments;private final PropertyImageService images;private final EntityManager em;
    public record Group(OwnerPropertyResponse property,List<OwnerApartmentResponse> apartments) {}
    @Transactional(readOnly=true) public List<Group> list(Jwt jwt){
        access.read(jwt);var units=apartmentService.selfList(jwt);
        return propertyService.selfList(jwt).stream().map(p->new Group(p,units.stream().filter(a->a.propertyId().equals(p.id())).toList())).toList();
    }
    @Transactional public void update(Jwt jwt,Long id,ApartmentInformationUpdate input){
        var a=apartments.findForOwnerUpdate(id,access.write(jwt).getId()).orElseThrow(AssetManagementService::missing);
        if(a.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"STALE_VERSION","Thông tin căn hộ đã thay đổi. Hãy tải lại.");
        a.setTitle(input.getTitle().strip());a.setDescription(input.getDescription().strip());a.setMaxOccupants(input.getMaxOccupants());
        a.setAmenities(new ArrayList<>(input.getAmenities().stream().map(String::strip).distinct().toList()));apartments.flush();
    }
    @Transactional public void gallery(Jwt jwt,Long id,PropertyGalleryUpdate input){
        var p=properties.findOwnedForCreation(id,access.write(jwt).getId()).orElseThrow(AssetManagementService::missing);em.refresh(p,LockModeType.PESSIMISTIC_WRITE);
        if(p.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"STALE_VERSION","Ảnh tài sản đã thay đổi. Hãy tải lại.");
        // Gallery là bảng con: tăng version cha ngay trong khóa hiện tại để chặn ghi đè đồng thời.
        images.replace(p,input.getImageIds());properties.bumpVersion(p.getId());em.refresh(p);
    }
    private static RuntimeException missing(){return error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản của bạn.");}
}

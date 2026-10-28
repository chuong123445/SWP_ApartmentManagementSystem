package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import java.time.*;
@Service
@lombok.RequiredArgsConstructor
public class PropertyRightsPolicy {
    private final com.ancu.proptech.repository.property.PropertyRepository properties;
    private final jakarta.persistence.EntityManager em;
    public LocalDate today(){return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    public boolean limited(Property p){return p.getRightType()==PropertyDossier.RightType.AUTHORIZATION || p.getRightType()==PropertyDossier.RightType.SUBLEASE;}
    public void requireCurrent(Property p){
        // Khóa và tải lại thời hạn để không dùng quyền cũ khi Admin vừa duyệt hồ sơ gia hạn.
        if(p.getId()!=null){properties.lockById(p.getId()).orElseThrow();em.refresh(p);}
        if(limited(p)&&(p.getRightsValidFrom()==null||p.getRightsValidUntil()==null||today().isBefore(p.getRightsValidFrom())||today().isAfter(p.getRightsValidUntil())))
            throw new ApiException(HttpStatus.CONFLICT,"PROPERTY_RIGHTS_UNAVAILABLE","Quyền cho thuê chưa có hiệu lực hoặc đã hết hạn. Cần hồ sơ được Admin duyệt với thời hạn phù hợp.");
    }
    public void contract(Property p,LocalDate start,LocalDate end){
        requireCurrent(p);
        if(limited(p)&&(start.isBefore(p.getRightsValidFrom())||end.isAfter(p.getRightsValidUntil())))
            throw new ApiException(HttpStatus.CONFLICT,"CONTRACT_EXCEEDS_PROPERTY_RIGHTS","Thời hạn hợp đồng phải nằm trong thời gian được phép cho thuê đã được duyệt.");
    }
}

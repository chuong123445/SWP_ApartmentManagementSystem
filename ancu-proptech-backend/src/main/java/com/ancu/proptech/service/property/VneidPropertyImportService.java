package com.ancu.proptech.service.property;

import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.exception.common.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

/** Compatibility boundary for retired clients. Auth0 verifies accounts, never property ownership. */
@Service
public class VneidPropertyImportService {
    public record UnitState(String externalUnitId,String apartmentId,String publicationStatus) {}
    public record Candidate(VneidAsset asset,String sourceVersion,boolean imported,String propertyId,Long propertyVersion,
                            List<UnitState> unitStates,String appendBlockedReason) {}
    public List<Candidate> list(Jwt jwt) { throw retired(); }
    public OwnerPropertyCreated importProperty(Jwt jwt,VneidPropertyImportRequest input) { throw retired(); }
    public OwnerPropertyCreated appendUnits(Jwt jwt,Long propertyId,VneidUnitsAppendRequest input) { throw retired(); }
    public static ApiException retired() {
        return new ApiException(HttpStatus.GONE,"PROPERTY_SOURCE_RETIRED","Không còn lấy tài sản từ VNeID/Auth0. Hãy nhập tài sản và nộp hồ sơ quyền cho thuê để xét duyệt.");
    }
}

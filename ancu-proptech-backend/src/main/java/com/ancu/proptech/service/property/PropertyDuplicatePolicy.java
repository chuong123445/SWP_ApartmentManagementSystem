package com.ancu.proptech.service.property;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.property.PropertyEvidenceFile;
import com.ancu.proptech.repository.property.PropertyDuplicateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class PropertyDuplicatePolicy {
    private final PropertyDuplicateRepository duplicates;

    public void lockApproval() {
        if(!duplicates.lockApproval())throw new ApiException(HttpStatus.CONFLICT,"REVIEW_BUSY","Đang xử lý hồ sơ khác. Hãy thử lại.");
    }

    public void check(Long propertyId,String certificate,List<PropertyEvidenceFile> files) {
        String normalized=normalize(certificate);
        if(!normalized.isEmpty()&&duplicates.approvedCertificates(propertyId).stream().anyMatch(value->normalized.equals(normalize(value))))
            throw new ApiException(HttpStatus.CONFLICT,"CERTIFICATE_ALREADY_APPROVED","Giấy chứng nhận đã được sử dụng cho tài sản đã duyệt. Hãy mở tài sản hiện có để bổ sung phòng.");
        for(var file:files)if(file.getPurpose()==PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT&&duplicates.approvedEvidenceMatches(propertyId,file.getId()))
            throw new ApiException(HttpStatus.CONFLICT,"EVIDENCE_ALREADY_APPROVED","Chứng từ sở hữu này đã được dùng cho tài sản đã duyệt. Hãy bổ sung phòng trên tài sản hiện có hoặc kiểm tra lại giấy tờ.");
    }

    static String normalize(String value) {
        return value==null?"":Normalizer.normalize(value,Normalizer.Form.NFKC).replaceAll("[^\\p{L}\\p{N}]","").toUpperCase(Locale.ROOT);
    }
}

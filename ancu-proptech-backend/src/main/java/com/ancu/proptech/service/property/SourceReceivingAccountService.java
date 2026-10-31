package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.SourceReceivingAccountUpdate;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import com.ancu.proptech.service.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class SourceReceivingAccountService {
    private final AccountAccessService access;
    private final PropertyRepository properties;
    private final PropertyExternalImportRepository imports;
    private final ExternalIdentityRepository identities;
    @Transactional public void update(Jwt jwt,Long propertyId,SourceReceivingAccountUpdate input) {
        var owner=access.owner(jwt);
        properties.findOwnedForCreation(propertyId,owner.getId()).orElseThrow(()->error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản của bạn."));
        var source=imports.findById(propertyId).orElseThrow(()->error(HttpStatus.CONFLICT,"SOURCE_PROPERTY_REQUIRED","Chỉ cập nhật tài khoản riêng cho tài sản nhập từ VNeID."));
        var identity=identities.findById(owner.getId()).filter(i->"VERIFIED".equals(i.getVerificationStatus())
            &&source.getIssuer().equals(i.getIssuer())&&source.getSubject().equals(i.getSubject())).orElseThrow(()->error(HttpStatus.FORBIDDEN,"VNEID_LINK_CHANGED","Liên kết VNeID không còn phù hợp."));
        if(source.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"VERSION_CONFLICT","Thông tin nhận tiền đã thay đổi. Hãy tải lại.");
        if(!normalize(identity.getLegalName()).equals(normalize(input.getAccountHolderName())))throw error(HttpStatus.BAD_REQUEST,"ACCOUNT_HOLDER_MISMATCH","Tên chủ tài khoản cần khớp họ tên căn cước đã xác thực.");
        source.setBank(input.getBank().strip());source.setAccountNumber(input.getAccountNumber().strip());
        source.setAccountHolderName(input.getAccountHolderName().strip());source.setReceivingAccountUpdatedAt(Instant.now());imports.flush();
    }
    private String normalize(String value){return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").replace('đ','d').replace('Đ','D').strip().replaceAll("\\s+"," ").toUpperCase(Locale.ROOT);}
}

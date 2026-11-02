package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.ContractSnapshot;
import com.ancu.proptech.dto.property.VneidAsset;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.HexFormat;
@Service @RequiredArgsConstructor
public class ContractPropertyEvidenceResolver {
    private final PropertyExternalImportRepository imports;
    private final PropertyDossierRepository dossiers;
    private final ObjectMapper json;
    public record Resolved(String dossierId,String right,String certificate,LocalDate date,String place,String description,
            Boolean fixture,ContractSnapshot.ReceivingAccount bank,ContractSnapshot.Evidence evidence) {}
    public Resolved resolve(Property property) {
        var source=imports.findById(property.getId()).orElse(null);
        if(source!=null) {
            // Đọc snapshot đã lưu, không gọi lại Auth0 và không tạo quyết định Admin giả.
            var asset=json.readValue(source.getSourceSnapshot(),VneidAsset.class);
            var bank=source.getBank()==null?null:new ContractSnapshot.ReceivingAccount(source.getBank(),source.getAccountNumber(),source.getAccountHolderName());
            return new Resolved(null,"OWNERSHIP",asset.certificateNumber(),date(asset.certificateDate()),asset.certificatePlace(),asset.rightDescription(),false,bank,
                new ContractSnapshot.Evidence(source.getSource(),asset.externalAssetId(),source.getSourceVersion(),source.getImportedAt(),source.getVersion()));
        }
        var approved=dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(property.getId()).stream()
            .filter(d->d.getStatus()==PropertyDossier.Status.APPROVED)
            .filter(d->property.getApprovedRightsDossierId()==null||property.getApprovedRightsDossierId().equals(d.getId())).findFirst().orElse(null);
        if(approved==null)return new Resolved(null,null,null,null,null,null,null,null,null);
        var bank=new ContractSnapshot.ReceivingAccount(approved.getBank(),approved.getAccountNumber(),approved.getAccountHolderName());
        var hash=hash(json.writeValueAsString(java.util.Arrays.asList(approved.getId(),approved.getVersion(),approved.getRightType(),approved.getCertificateNumber(),approved.getCertificateIssueDate(),approved.getCertificateIssuePlace(),approved.getExploitationRightDescription(),bank)));
        return new Resolved(approved.getId().toString(),approved.getRightType().name(),approved.getCertificateNumber(),approved.getCertificateIssueDate(),approved.getCertificateIssuePlace(),approved.getExploitationRightDescription(),approved.isLocalFixture(),bank,
            new ContractSnapshot.Evidence("ADMIN_APPROVED_DOSSIER",approved.getId().toString(),hash,approved.getReviewedAt()==null?approved.getSubmittedAt():approved.getReviewedAt(),null));
    }
    private LocalDate date(String value){try{return value==null?null:LocalDate.parse(value);}catch(java.time.format.DateTimeParseException e){return null;}}
    private String hash(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}

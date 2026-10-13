package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.PropertyEvidenceResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.*;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class PropertyEvidenceService {
    private final PropertyRepository properties;
    private final PropertyEvidenceFileRepository files;
    private final PropertyEvidenceContentRepository contents;
    private final PropertyDossierRepository dossiers;
    private final AccountAccessService access;
    public record Download(String filename,String contentType,byte[] content) {}
    @Transactional public PropertyEvidenceResponse upload(Jwt jwt,UUID propertyId,PropertyEvidenceFile.Purpose purpose,MultipartFile input){
        var owner=access.owner(jwt);var property=properties.findOwnedForCreation(propertyId,owner.getId()).orElseThrow(PropertyEvidenceService::missing);
        if(property.getApprovalStatus()==Property.ApprovalStatus.PENDING_APPROVAL||property.getApprovalStatus()==Property.ApprovalStatus.APPROVED)
            throw error(HttpStatus.CONFLICT,"PROPERTY_NOT_EDITABLE","Chỉ bổ sung chứng từ cho tài sản nháp, bị từ chối hoặc cần bổ sung.");
        if(files.countByPropertyId(propertyId)>=200)throw error(HttpStatus.CONFLICT,"FILE_LIMIT","Tài sản đã đạt giới hạn 200 chứng từ.");
        if(input.isEmpty()||input.getSize()>5*1024*1024)throw error(HttpStatus.BAD_REQUEST,"INVALID_FILE","Ảnh chứng từ phải có dung lượng từ 1 byte đến 5 MB.");
        byte[] canonical;String format;
        try(var stream=ImageIO.createImageInputStream(input.getInputStream())){
            var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw invalidImage();var reader=readers.next();
            try{
                reader.setInput(stream);format=reader.getFormatName().toLowerCase(Locale.ROOT);
                if(!Set.of("png","jpeg").contains(format))throw invalidImage();
                int width=reader.getWidth(0),height=reader.getHeight(0);
                if(width<=0||height<=0||(long)width*height>20_000_000)throw invalidImage();
                var image=reader.read(0);var output=new ByteArrayOutputStream();
                if(image==null||!ImageIO.write(image,format,output))throw invalidImage();
                canonical=output.toByteArray();if(canonical.length>5*1024*1024)throw invalidImage();
            }finally{reader.dispose();}
        }catch(IOException e){throw invalidImage();}
        var file=new PropertyEvidenceFile();file.setProperty(property);file.setUploader(owner);file.setPurpose(purpose);
        String original=Objects.requireNonNullElse(input.getOriginalFilename(),"chung-tu").replace('\\','/');
        String base=original.substring(original.lastIndexOf('/')+1).replaceAll("[^\\p{L}\\p{N} ._-]","_");
        base=base.replaceFirst("(?i)\\.(png|jpe?g)$","");if(base.isBlank())base="chung-tu";
        if(base.length()>130)base=base.substring(0,130);
        file.setFilename(base+ (format.equals("png")?".png":".jpg"));file.setContentType(format.equals("png")?"image/png":"image/jpeg");
        file.setSizeBytes(canonical.length);file.setCreatedAt(Instant.now());files.saveAndFlush(file);
        var content=new PropertyEvidenceContent();content.setId(file.getId());content.setContent(canonical);contents.save(content);
        return response(file);
    }
    @Transactional(readOnly=true) public Download download(Jwt jwt,UUID id){
        var account=access.account(jwt);var file=files.findById(id).orElseThrow(PropertyEvidenceService::missing);
        if(account.getRole()==AuthAccount.Role.ADMIN){access.admin(jwt);if(dossiers.countSubmittedFile(id)==0)throw missing();}
        else{access.owner(jwt);if(!file.getProperty().getOwner().getId().equals(account.getId()))throw missing();}
        return new Download(file.getFilename(),file.getContentType(),contents.findById(id).orElseThrow(PropertyEvidenceService::missing).getContent());
    }
    public static PropertyEvidenceResponse response(PropertyEvidenceFile f){return new PropertyEvidenceResponse(f.getId(),f.getPurpose().name(),f.getFilename(),f.getContentType(),f.getSizeBytes());}
    private static ApiException invalidImage(){return error(HttpStatus.BAD_REQUEST,"INVALID_FILE","Chỉ nhận ảnh PNG/JPEG hợp lệ, tối đa 5 MB và 20 triệu điểm ảnh. Hãy tải ảnh chụp hoặc bản scan giấy tờ.");}
    private static ApiException error(HttpStatus status,String code,String text){return new ApiException(status,code,text);}
    private static ApiException missing(){return error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy chứng từ thuộc quyền truy cập.");}
}

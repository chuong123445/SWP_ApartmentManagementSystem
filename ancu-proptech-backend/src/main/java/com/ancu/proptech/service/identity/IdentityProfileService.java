package com.ancu.proptech.service.identity;

import com.ancu.proptech.dto.identity.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.identity.*;
import com.ancu.proptech.repository.identity.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
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
public class IdentityProfileService {
    private final IdentityProfileRepository profiles;
    private final IdentityDocumentsRepository documents;
    private final AuthAccountRepository accounts;
    private final AccountAccessService access;
    public record Image(byte[] content,String contentType) {}

    @Transactional(readOnly=true)
    public IdentityProfileResponse mine(Jwt jwt){return profiles.findById(access.account(jwt).getId()).map(IdentityProfileService::response).orElse(null);}

    @Transactional
    public IdentityProfileResponse save(Jwt jwt,IdentityProfileInput input,MultipartFile front,MultipartFile back){
        var account=access.account(jwt);
        // Lock the account even on first creation, so two creates cannot overwrite one another.
        accounts.findForIdentityUpdate(account.getId()).orElseThrow(IdentityProfileService::missing);
        var previous=profiles.findById(account.getId());
        if(previous.isEmpty()?input.getVersion()!=null:!Objects.equals(input.getVersion(),previous.get().getVersion()))
            throw error(HttpStatus.CONFLICT,"STALE_VERSION","Hồ sơ đã thay đổi. Hãy tải lại trước khi lưu.");
        if(input.getIssueDate().isBefore(input.getDateOfBirth()))
            throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Ngày cấp không được trước ngày sinh.");
        var images=documents.findById(account.getId()).orElseGet(IdentityDocuments::new);
        // Validate both uploads before changing either database entity.
        var frontImage=front==null?null:canonical(front);var backImage=back==null?null:canonical(back);
        if((frontImage==null&&images.getFrontContent()==null)||(backImage==null&&images.getBackContent()==null))
            throw error(HttpStatus.BAD_REQUEST,"IDENTITY_IMAGES_REQUIRED","Cần ảnh mặt trước và mặt sau căn cước.");
        var profile=previous.orElseGet(IdentityProfile::new);profile.setAccountId(account.getId());
        profile.setLegalName(input.getLegalName().strip());profile.setDocumentNumber(input.getDocumentNumber());
        profile.setDateOfBirth(input.getDateOfBirth());profile.setIssueDate(input.getIssueDate());profile.setIssuePlace(input.getIssuePlace().strip());
        profile.setPermanentAddress(input.getPermanentAddress().strip());profile.setCurrentAddress(input.getCurrentAddress().strip());
        profile.setVerificationStatus(IdentityProfile.VerificationStatus.NOT_VERIFIED);profile.setUpdatedAt(Instant.now());
        // Editing text alone does not turn synthetic evidence into real documents.
        if(previous.isEmpty() || (frontImage!=null && backImage!=null))profile.setLocalFixture(false);
        images.setAccountId(account.getId());
        if(frontImage!=null){images.setFrontContent(frontImage.content());images.setFrontContentType(frontImage.contentType());}
        if(backImage!=null){images.setBackContent(backImage.content());images.setBackContentType(backImage.contentType());}
        profile=profiles.saveAndFlush(profile);documents.saveAndFlush(images);
        return response(profile);
    }

    @Transactional(readOnly=true)
    public Image download(Jwt jwt,String side){
        if(!Set.of("front","back").contains(side))throw missing();
        var image=documents.findById(access.account(jwt).getId()).orElseThrow(IdentityProfileService::missing);
        return side.equals("front")?new Image(image.getFrontContent(),image.getFrontContentType()):new Image(image.getBackContent(),image.getBackContentType());
    }

    private static Image canonical(MultipartFile file){
        if(file.isEmpty()||file.getSize()>5*1024*1024)throw invalidImage();
        try(var stream=ImageIO.createImageInputStream(file.getInputStream())){
            var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw invalidImage();var reader=readers.next();
            try{
                reader.setInput(stream);String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                if(!Set.of("png","jpeg").contains(format))throw invalidImage();
                int width=reader.getWidth(0),height=reader.getHeight(0);
                if(width<=0||height<=0||(long)width*height>20_000_000)throw invalidImage();
                var decoded=reader.read(0);var output=new ByteArrayOutputStream();
                if(decoded==null||!ImageIO.write(decoded,format,output)||output.size()>5*1024*1024)throw invalidImage();
                return new Image(output.toByteArray(),format.equals("png")?"image/png":"image/jpeg");
            }finally{reader.dispose();}
        }catch(IOException e){throw invalidImage();}
    }
    private static IdentityProfileResponse response(IdentityProfile p){return new IdentityProfileResponse(p.getLegalName(),p.getDocumentNumber(),p.getDateOfBirth(),p.getIssueDate(),p.getIssuePlace(),p.getPermanentAddress(),p.getCurrentAddress(),p.getVerificationStatus().name(),p.getUpdatedAt(),p.getVersion(),p.isLocalFixture());}
    private static ApiException invalidImage(){return error(HttpStatus.BAD_REQUEST,"INVALID_FILE","Chỉ nhận ảnh PNG/JPEG hợp lệ, tối đa 5 MB mỗi ảnh và 20 triệu điểm ảnh.");}
    private static ApiException missing(){return error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy ảnh căn cước của bạn.");}
    private static ApiException error(HttpStatus status,String code,String message){return new ApiException(status,code,message);}
}

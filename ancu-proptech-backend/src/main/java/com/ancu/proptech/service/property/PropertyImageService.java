package com.ancu.proptech.service.property;

import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
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
public class PropertyImageService {
    private final PropertyImageRepository images;
    private final PropertyRepository properties;
    private final ApartmentRepository apartments;
    private final PropertyApplicantAccess applicants;
    private final AccountAccessService access;
    public record Image(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,String url){}
    public record Download(byte[] content,String contentType){}
    /** Đọc kích thước trước khi giải mã; mã hóa lại PNG để loại metadata/nội dung kèm. */
    @Transactional public List<Image> upload(Jwt jwt,List<MultipartFile> files){
        var a=applicants.verified(jwt);
        if(files.isEmpty()||files.size()>4)throw bad("Mỗi tài sản cần từ 1 đến 4 ảnh.");
        if(images.countByUploaderIdAndPropertyIdIsNull(a.getId())+files.size()>100)throw bad("Có quá nhiều ảnh chưa gắn tài sản.");
        var result=new ArrayList<Image>();
        for(var file:files){
            if(file.isEmpty()||file.getSize()>5*1024*1024)throw bad("Mỗi ảnh JPEG/PNG tối đa 5MB.");
            try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))){
                var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw bad("Chỉ nhận ảnh JPEG hoặc PNG hợp lệ.");
                var reader=readers.next();byte[] canonical;
                try{var format=reader.getFormatName();if(!format.equalsIgnoreCase("jpeg")&&!format.equalsIgnoreCase("png"))throw bad("Chỉ nhận ảnh JPEG hoặc PNG.");
                    reader.setInput(stream);long width=reader.getWidth(0),height=reader.getHeight(0);
                    if(width<=0||height<=0||width*height>20_000_000)throw bad("Ảnh tối đa 20 triệu điểm ảnh.");
                    var out=new ByteArrayOutputStream();if(!ImageIO.write(reader.read(0),"png",out))throw bad("Không đọc được ảnh.");canonical=out.toByteArray();
                    if(canonical.length>10*1024*1024)throw bad("Ảnh sau xử lý quá lớn. Hãy giảm kích thước.");
                }finally{reader.dispose();}
                var image=new PropertyImage();image.setUploaderId(a.getId());image.setContentType("image/png");image.setCreatedAt(Instant.now());image.setContent(canonical);
                images.saveAndFlush(image);result.add(new Image(image.getId(),url(image.getId())));
            }catch(IOException e){throw bad("Không đọc được ảnh JPEG/PNG.");}
        }return result;
    }
    /** Khóa ảnh theo thứ tự ID; gắn toàn bộ cùng transaction tạo tài sản, không cho lấy ảnh người khác. */
    public void bind(Property property,List<Long> ids){
        if(ids==null||ids.isEmpty()||ids.size()>4||new HashSet<>(ids).size()!=ids.size())throw bad("Tài sản cần từ 1 đến 4 ảnh khác nhau.");
        var locked=new HashMap<Long,PropertyImage>();
        ids.stream().sorted().forEach(id->{var i=images.findForBinding(id).filter(x->x.getUploaderId().equals(property.getOwner().getId())&&x.getPropertyId()==null).orElseThrow(()->bad("Ảnh không thuộc bạn hoặc đã được sử dụng."));locked.put(id,i);});
        for(int n=0;n<ids.size();n++){var i=locked.get(ids.get(n));i.setPropertyId(property.getId());i.setPosition(n);}
    }
    @Transactional(readOnly=true) public Download download(Jwt jwt,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id){
        var image=images.findById(id).orElseThrow(PropertyImageService::missing);
        boolean publicImage=image.getPropertyId()!=null&&apartments.existsByPropertyIdAndPublicationStatus(image.getPropertyId(),com.ancu.proptech.model.apartment.Apartment.PublicationStatus.PUBLISHED)
            &&properties.findById(image.getPropertyId()).filter(p->p.getApprovalStatus()==Property.ApprovalStatus.APPROVED&&p.getOwner().getStatus()==com.ancu.proptech.model.auth.AuthAccount.Status.ACTIVE).isPresent();
        if(!publicImage&&(jwt==null||!access.account(jwt).getId().equals(image.getUploaderId())))throw missing();
        return new Download(image.getContent(),image.getContentType());
    }
    @Transactional(readOnly=true) public List<String> urls(Long property){return images.ids(property).stream().map(PropertyImageService::url).toList();}
    public static String url(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id){return "/api/v1/property-images/"+id;}
    private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PROPERTY_IMAGES",message);}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy ảnh tài sản.");}
}

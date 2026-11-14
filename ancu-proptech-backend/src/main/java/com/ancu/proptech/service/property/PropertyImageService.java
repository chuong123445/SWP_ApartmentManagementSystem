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
        if(images.countByUploaderIdAndPropertyIdIsNull(a.getId())+files.size()>300)throw bad("Có quá nhiều ảnh chưa gắn tài sản.");
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
        if(ids==null||ids.isEmpty()||ids.size()>4||ids.stream().anyMatch(Objects::isNull)||new HashSet<>(ids).size()!=ids.size())throw bad("Tài sản cần từ 1 đến 4 ảnh khác nhau.");
        var locked=new HashMap<Long,PropertyImage>();
        ids.stream().sorted().forEach(id->{var i=images.findForBinding(id).filter(x->x.getUploaderId().equals(property.getOwner().getId())&&x.getPropertyId()==null).orElseThrow(()->bad("Ảnh không thuộc bạn hoặc đã được sử dụng."));locked.put(id,i);});
        for(int n=0;n<ids.size();n++){var i=locked.get(ids.get(n));i.setPropertyId(property.getId());i.setPosition(n);}
    }
    /** Giữ ảnh đã chọn, gắn ảnh staging mới và xóa ảnh bỏ chọn trong cùng transaction. */
    public void replace(Property property,List<Long> ids){
        if(ids==null||ids.isEmpty()||ids.size()>4||ids.stream().anyMatch(Objects::isNull)||new HashSet<>(ids).size()!=ids.size())throw bad("Cần giữ từ 1 đến 4 ảnh khác nhau.");
        var selected=new HashMap<Long,PropertyImage>();
        ids.stream().sorted().forEach(id->{var image=images.findForBinding(id).filter(i->i.getUploaderId().equals(property.getOwner().getId())&&(i.getPropertyId()==null||(i.getPropertyId().equals(property.getId())&&i.getApartmentId()==null))).orElseThrow(()->bad("Không được lấy ảnh của người khác hoặc tài sản khác."));selected.put(id,image);});
        var removed=images.findByPropertyIdAndApartmentIdIsNullOrderByPositionAsc(property.getId()).stream().filter(i->!selected.containsKey(i.getId())).toList();
        images.deleteAll(removed);
        for(int n=0;n<ids.size();n++){var image=selected.get(ids.get(n));image.setPropertyId(property.getId());image.setPosition(n);}images.flush();
    }
    public void replaceUnit(Property property,Long apartmentId,List<Long> ids){
        if(ids==null||ids.isEmpty()||ids.size()>4||ids.stream().anyMatch(Objects::isNull)||new HashSet<>(ids).size()!=ids.size())
            throw bad("Cần giữ từ 1 đến 4 ảnh riêng khác nhau.");
        var selected=new HashMap<Long,PropertyImage>();
        ids.stream().sorted().forEach(id->{
            var image=images.findForBinding(id).filter(candidate->candidate.getUploaderId().equals(property.getOwner().getId())
                    &&(candidate.getPropertyId()==null||(candidate.getPropertyId().equals(property.getId())&&Objects.equals(candidate.getApartmentId(),apartmentId))))
                    .orElseThrow(()->bad("Ảnh không thuộc phòng hoặc tài khoản của bạn."));
            selected.put(id,image);
        });
        var removed=images.findByApartmentIdOrderByPositionAsc(apartmentId).stream().filter(image->!selected.containsKey(image.getId())).toList();
        images.deleteAll(removed);
        for(int index=0;index<ids.size();index++){
            var image=selected.get(ids.get(index));image.setPropertyId(property.getId());image.setApartmentId(apartmentId);image.setPosition(index);
        }
        images.flush();
    }
    @Transactional(readOnly=true) public List<Image> unitGallery(Long apartmentId){
        return images.unitIds(apartmentId).stream().map(id->new Image(id,url(id))).toList();
    }
    @Transactional(readOnly=true) public List<Image> gallery(Long property){return images.ids(property).stream().map(id->new Image(id,url(id))).toList();}
    @Transactional(readOnly=true) public Download download(Jwt jwt,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id){
        var image=images.findById(id).orElseThrow(PropertyImageService::missing);
        boolean unitPublic=image.getApartmentId()==null||apartments.findById(image.getApartmentId()).filter(a->a.getProperty().getId().equals(image.getPropertyId())&&a.getPublicationStatus()==com.ancu.proptech.model.apartment.Apartment.PublicationStatus.PUBLISHED).isPresent();
        boolean publicImage=unitPublic&&image.getPropertyId()!=null&&apartments.existsByPropertyIdAndPublicationStatus(image.getPropertyId(),com.ancu.proptech.model.apartment.Apartment.PublicationStatus.PUBLISHED)
            &&properties.findById(image.getPropertyId()).filter(p->p.getApprovalStatus()==Property.ApprovalStatus.APPROVED&&p.getOwner().getStatus()==com.ancu.proptech.model.auth.AuthAccount.Status.ACTIVE).isPresent();
        if(!publicImage&&(jwt==null||!access.account(jwt).getId().equals(image.getUploaderId())))throw missing();
        return new Download(image.getContent(),image.getContentType());
    }
    @Transactional(readOnly=true) public List<String> urls(Long property){return images.ids(property).stream().map(PropertyImageService::url).toList();}
    public void bindUnit(Property property,Long apartment,List<Long> ids){
        if(ids==null||ids.isEmpty())return;
        if(ids.size()>4||ids.stream().anyMatch(Objects::isNull)||new HashSet<>(ids).size()!=ids.size())throw bad("Mỗi căn cần tối đa 4 ảnh khác nhau.");
        var locked=new HashMap<Long,PropertyImage>();
        ids.stream().sorted().forEach(id->{var i=images.findForBinding(id).filter(x->x.getUploaderId().equals(property.getOwner().getId())&&x.getPropertyId()==null).orElseThrow(()->bad("Ảnh phòng không thuộc bạn hoặc đã được sử dụng."));locked.put(id,i);});
        for(int n=0;n<ids.size();n++){var i=locked.get(ids.get(n));i.setPropertyId(property.getId());i.setApartmentId(apartment);i.setPosition(n);}
    }
    @Transactional(readOnly=true) public List<String> unitUrls(Long property,Long apartment){
        return unitUrls(property,apartment,null);
    }
    @Transactional(readOnly=true) public List<String> unitUrls(Long property,Long apartment,String legacyCover){
        var result=new ArrayList<String>();images.unitIds(apartment).forEach(id->result.add(url(id)));
        if(result.isEmpty()&&legacyCover!=null&&!legacyCover.isBlank()&&!legacyCover.equals("/images/apartment-placeholder.svg"))result.add(legacyCover);
        result.addAll(urls(property));return List.copyOf(new LinkedHashSet<>(result));
    }
    public static String url(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id){return "/api/v1/property-images/"+id;}
    private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PROPERTY_IMAGES",message);}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy ảnh tài sản.");}
}

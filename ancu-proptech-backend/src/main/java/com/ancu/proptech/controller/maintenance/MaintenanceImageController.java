package com.ancu.proptech.controller.maintenance;
import com.ancu.proptech.model.maintenance.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.maintenance.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;

@RestController @RequiredArgsConstructor
public class MaintenanceImageController {
 private final MaintenanceTicketRepository tickets;
 private final MaintenanceImageRepository images;
 private final MaintenanceEventRepository events;
 private final AccountAccessService access;
 public enum Kind { BEFORE, AFTER, RECEIPT }
 public record Image(String id,String kind){}
 @PostMapping("/api/v1/maintenance-tickets/{id}/images") @Transactional
 public Image upload(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@RequestParam Kind kind,@RequestPart MultipartFile file)throws java.io.IOException{
  var account=access.account(jwt);var t=tickets.lock(id).orElseThrow(MaintenanceImageController::missing);requireParty(t,account);
  if(kind!=Kind.BEFORE && !t.getProperty().getOwner().getId().equals(account.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ chủ nhà được thêm ảnh kết quả hoặc chứng từ.");
  if(java.util.Set.of(MaintenanceTicket.Status.RESOLVED,MaintenanceTicket.Status.CANCELLED,MaintenanceTicket.Status.REJECTED).contains(t.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"INVALID_STATE","Phiếu đã đóng, không thể thêm ảnh.");
  if(images.countByTicketId(id)>=5)throw invalid("Mỗi phiếu tối đa 5 ảnh.");
  if(file.isEmpty() || file.getSize()>1000000)throw invalid("Ảnh phải nhỏ hơn hoặc bằng 1 MB.");
  byte[] bytes=file.getBytes();String mime;
  try(var stream=javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))){
   var readers=javax.imageio.ImageIO.getImageReaders(stream);if(!readers.hasNext())throw invalid("Chỉ nhận ảnh PNG hoặc JPEG hợp lệ.");
   var reader=readers.next();try{reader.setInput(stream);var format=reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
    if(!format.equals("png")&&!format.equals("jpeg"))throw invalid("Chỉ nhận PNG hoặc JPEG.");
    int width=reader.getWidth(0),height=reader.getHeight(0);if(width<1||height<1||width>4096||height>4096||(long)width*height>12000000)throw invalid("Kích thước ảnh vượt giới hạn.");
    if(reader.read(0)==null)throw invalid("Không đọc được ảnh.");mime=format.equals("png")?"image/png":"image/jpeg";
   }finally{reader.dispose();}
  }catch(javax.imageio.IIOException e){throw invalid("Ảnh bị lỗi hoặc không hợp lệ.");}
  var image=new MaintenanceImage();image.setTicketId(id);image.setKind(kind.name());image.setContent(bytes);image.setContentType(mime);image.setCreatedAt(Instant.now());images.saveAndFlush(image);
  var event=new MaintenanceEvent();event.setTicketId(id);event.setActorId(account.getId());event.setAction("IMAGE_ADDED");event.setNote("Đã thêm ảnh "+kind.name());event.setCreatedAt(Instant.now());events.saveAndFlush(event);
  return new Image(image.getId().toString(),image.getKind());
 }
 @GetMapping("/api/v1/maintenance-images/{id}") @Transactional(readOnly=true)
 public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){
  var account=access.account(jwt);var image=images.findById(id).orElseThrow(MaintenanceImageController::missing);
  requireParty(tickets.findById(image.getTicketId()).orElseThrow(MaintenanceImageController::missing),account);
  return ResponseEntity.ok().header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(image.getContentType())).body(image.getContent());
 }
 private void requireParty(MaintenanceTicket t,AuthAccount a){if(!t.getProperty().getOwner().getId().equals(a.getId())&&!t.getReporter().getId().equals(a.getId())&&(t.getTenant()==null||!t.getTenant().getId().equals(a.getId())))throw missing();}
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy ảnh hoặc phiếu thuộc tài khoản của bạn.");}
 private static ApiException invalid(String message){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_IMAGE",message);}
}

package com.ancu.proptech.service.billing;
import com.ancu.proptech.dto.billing.InvoiceRoomSummary;
import com.ancu.proptech.repository.billing.InvoiceRoomSummaryRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import java.util.List;
@Service @RequiredArgsConstructor
public class InvoiceRoomService {
 private final InvoiceRoomSummaryRepository summaries;private final ApartmentRepository apartments;private final AccountAccessService access;
 @Transactional(readOnly=true) public List<InvoiceRoomSummary> rooms(Jwt jwt,Long propertyId){return summaries.rooms(access.owner(jwt).getId(),propertyId);}
 public void requireRoom(Long ownerId,Long propertyId,Long apartmentId){
  if(apartmentId==null)return;
  var room=apartments.findById(apartmentId).orElseThrow(InvoiceRoomService::missing);
  if(!room.getProperty().getOwner().getId().equals(ownerId)||(propertyId!=null&&!room.getProperty().getId().equals(propertyId)))throw missing();
 }
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"ROOM_NOT_FOUND","Không tìm thấy căn/phòng trong phạm vi đang chọn.");}
}

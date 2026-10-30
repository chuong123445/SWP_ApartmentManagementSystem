package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.billing.InvoiceService;
import com.ancu.proptech.repository.contract.ContractDraftRepository;
import com.ancu.proptech.repository.property.OwnerPaymentQrRepository;
import com.ancu.proptech.dto.contract.ContractSnapshot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import tools.jackson.databind.ObjectMapper;
@RestController @RequiredArgsConstructor
public class OwnerPaymentQrController {
 private final OwnerPaymentQrService service;private final PaymentQrDecoder decoder;private final PaymentQrNameReader names;private final AccountAccessService access;
 private final InvoiceService invoices;private final ContractDraftRepository drafts;private final OwnerPaymentQrRepository qrs;private final ObjectMapper json;
 public record Confirm(@NotBlank @Size(max=200) String accountHolderName,@NotNull @PositiveOrZero Long version,@AssertTrue boolean consent){}
 @GetMapping("/api/v1/owner/payment-qr/current") public ResponseEntity<OwnerPaymentQrService.View> current(@AuthenticationPrincipal Jwt jwt){var current=service.current(jwt);return current==null?ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build():ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(current);}
 @PostMapping("/api/v1/owner/payment-qr/scan") public ResponseEntity<OwnerPaymentQrService.View> scan(@AuthenticationPrincipal Jwt jwt,@RequestPart MultipartFile file,@RequestParam(defaultValue="false") boolean useAi)throws java.io.IOException {
  Long owner=access.owner(jwt).getId();if(file.getSize()>1000000)throw new com.ancu.proptech.exception.common.ApiException(HttpStatus.BAD_REQUEST,"INVALID_PAYMENT_QR","Ảnh QR tối đa 1 MB.");
  byte[] bytes=file.getBytes();var decoded=decoder.decode(bytes);var suggestion=names.read(bytes,decoded,useAi);
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.saveScan(owner,bytes,decoded,suggestion));
 }
 @PostMapping("/api/v1/owner/payment-qr/{id}/confirm") public ResponseEntity<OwnerPaymentQrService.View> confirm(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Confirm input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.confirm(jwt,id,input.accountHolderName(),input.version()));}
 @GetMapping("/api/v1/owner/payment-qr/{id}/image") public ResponseEntity<byte[]> image(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){var q=service.image(jwt,id);return imageResponse(q.getContentType(),q.getContent());}
 @GetMapping("/api/v1/invoices/{id}/payment-qr") @org.springframework.transaction.annotation.Transactional(readOnly=true)
 public ResponseEntity<byte[]> invoice(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id){
  var i=invoices.detail(jwt,id);var d=drafts.findByContractId(i.contractId()).orElseThrow(OwnerPaymentQrService::missing);
  var snapshot=json.readValue(d.getSnapshotJson(),ContractSnapshot.class);if(snapshot.ownerPaymentQrId()==null)throw OwnerPaymentQrService.missing();
  var q=qrs.findById(Long.valueOf(snapshot.ownerPaymentQrId())).filter(x->x.getConfirmedAt()!=null&&x.getOwnerId().equals(d.getContract().getApartment().getProperty().getOwner().getId())).orElseThrow(OwnerPaymentQrService::missing);
  return imageResponse(q.getContentType(),q.getContent());
 }
 private ResponseEntity<byte[]> imageResponse(String type,byte[] bytes){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(type)).body(bytes);}
}

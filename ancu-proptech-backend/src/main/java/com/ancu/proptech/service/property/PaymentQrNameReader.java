package com.ancu.proptech.service.property;
import com.ancu.proptech.service.property.ai.*;
import com.ancu.proptech.config.property.DossierAiSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
@Component @RequiredArgsConstructor
public class PaymentQrNameReader {
 private final DossierAiClient client;private final DossierAiSettings settings;private final ObjectMapper json;
 public record Suggestion(String name,String status){}
 public Suggestion read(byte[] bytes,PaymentQrDecoder.Decoded decoded,boolean useAi){
  if(!decoded.accountHolderName().isBlank())return new Suggestion(decoded.accountHolderName(),"QR_TEXT");
  if(!useAi)return new Suggestion("","NOT_REQUESTED");
  if(!settings.configured())return new Suggestion("","NOT_CONFIGURED");
  try {
   var report=client.analyze(json.valueToTree(Map.of("bank",decoded.bankName(),"accountNumber",decoded.accountNumber(),"instruction","Read only the visible accountHolderName on this payment QR image. Do not infer a name from account number.")),new DossierAiClient.Document("payment-qr","RECEIVING_ACCOUNT",decoded.contentType(),"payment-qr",bytes));
   if(!report.readable())return new Suggestion("","NEEDS_MANUAL_INPUT");
   var observed=report.extractedFields().stream().filter(x->x.field().equals("accountNumber")&&!x.value().isBlank()).map(x->x.value().replace(" ","")).toList();
   if(observed.stream().anyMatch(x->!x.equals(decoded.accountNumber())))return new Suggestion("","MISMATCH");
   var names=report.extractedFields().stream().filter(x->x.field().equals("accountHolderName")).map(x->x.value().strip()).filter(x->!x.isEmpty()&&x.length()<=200&&x.matches("[\\p{L}\\p{N} .&'/-]+" )).distinct().toList();
   return names.size()==1?new Suggestion(names.getFirst(),"AI_SUGGESTED"):new Suggestion("","NEEDS_MANUAL_INPUT");
  }catch(RuntimeException e){return new Suggestion("","AI_UNAVAILABLE");}
 }
}

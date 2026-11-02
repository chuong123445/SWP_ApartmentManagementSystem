package com.ancu.proptech.service.property;
import com.ancu.proptech.service.property.ai.*;
import com.ancu.proptech.config.property.DossierAiSettings;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class PaymentQrNameReaderTests {
 @Test void aiOnlySuggestsNameAndDoesNotOverrideDecodedAccount(){
  var client=mock(DossierAiClient.class);var config=new DossierAiSettings();config.setEnabled(true);config.setApiKey("test-only");config.setModel("test-model");var reader=new PaymentQrNameReader(client,config,new tools.jackson.databind.ObjectMapper());var decoded=new PaymentQrDecoder.Decoded("970422","MBBank","00123","","image/png");
  when(client.analyze(any(),any())).thenReturn(new DossierAiReport.FileReview("payment-qr",true,"QR",List.of(new DossierAiReport.Extraction("accountHolderName","NGUYEN VAN TEST")),List.of()));
  assertEquals("NGUYEN VAN TEST",reader.read(new byte[]{1},decoded,true).name());
  when(client.analyze(any(),any())).thenReturn(new DossierAiReport.FileReview("payment-qr",true,"QR",List.of(new DossierAiReport.Extraction("accountNumber","99999"),new DossierAiReport.Extraction("accountHolderName","WRONG")),List.of()));
  assertEquals("MISMATCH",reader.read(new byte[]{1},decoded,true).status());assertEquals("",reader.read(new byte[]{1},decoded,true).name());
  when(client.analyze(any(),any())).thenThrow(new DossierAiClient.Failure("PROVIDER_TIMEOUT",true));assertEquals("AI_UNAVAILABLE",reader.read(new byte[]{1},decoded,true).status());
  config.setEnabled(false);assertEquals("NOT_CONFIGURED",reader.read(new byte[]{1},decoded,true).status());
 }
}

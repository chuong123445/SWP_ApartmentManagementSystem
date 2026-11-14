package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.ListingDescriptionDtos.ListingFacts;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.PropertyImage;
import com.ancu.proptech.repository.property.PropertyImageRepository;
import com.ancu.proptech.service.ai.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ListingDescriptionServiceTests {
 private final AccountAccessService access=mock(AccountAccessService.class);
 private final AssistanceClient ai=mock(AssistanceClient.class);
 private final PropertyImageRepository images=mock(PropertyImageRepository.class);
 private final JsonMapper json=JsonMapper.builder().build();
 private final ListingDescriptionService service=new ListingDescriptionService(access,ai,new AssistanceLimit(),json,images);
 private ListingFacts facts(List<Long> ids){return new ListingFacts(new BigDecimal("25"),new BigDecimal("3000000"),1,2,1,1,List.of(),ids);}
 private void account(){var a=new AuthAccount();a.setId(8L);a.setRole(AuthAccount.Role.OWNER);when(access.account(null)).thenReturn(a);when(access.owner(null)).thenReturn(a);}
 @Test void anotherAccountsImageIsNeverSentToProvider(){account();var image=new PropertyImage();image.setUploaderId(99L);when(images.findById(1L)).thenReturn(Optional.of(image));assertThrows(RuntimeException.class,()->service.suggest(null,facts(List.of(1L))));verifyNoInteractions(ai);}
 @Test void noPhotosRemainsCompatibleWithTextGeneration(){account();when(ai.generate(anyString(),any(),any(),eq(List.of()))).thenReturn(json.readTree("{\"description\":\"Phòng 25 m², giá 3 triệu đồng/tháng.\"}"));assertTrue(service.suggest(null,facts(List.of())).description().contains("25"));}
 @Test void ownedPhotoIsCanonicalizedAndSentAsImage()throws Exception{account();var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(10,10,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",out);var image=new PropertyImage();image.setUploaderId(8L);image.setContent(out.toByteArray());when(images.findById(1L)).thenReturn(Optional.of(image));when(ai.generate(anyString(),any(),any(),argThat(list->list!=null&&list.size()==1&&list.get(0).mimeType().equals("image/jpeg")))).thenReturn(json.readTree("{\"description\":\"Phòng có cửa sổ.\"}"));assertEquals("Phòng có cửa sổ.",service.suggest(null,facts(List.of(1L))).description());}
}

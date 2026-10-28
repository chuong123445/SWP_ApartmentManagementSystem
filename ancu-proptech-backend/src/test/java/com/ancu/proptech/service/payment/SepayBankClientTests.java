package com.ancu.proptech.service.payment;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class SepayBankClientTests {
 SepayBankClient client;HttpClient http;
 @BeforeEach void setup(){client=new SepayBankClient(JsonMapper.builder().build(),"live");http=mock(HttpClient.class);ReflectionTestUtils.setField(client,"http",http);}
 @SuppressWarnings("unchecked") void response(int status,String body)throws Exception{HttpResponse<InputStream> response=mock(HttpResponse.class);when(response.statusCode()).thenReturn(status);when(response.body()).thenAnswer(i->new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));when(http.send(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any())).thenReturn(response);}
 String bank(){return "{\"id\":\"bank-1\",\"active\":1,\"bank_short_name\":\"Vietcombank\",\"bank_bin\":\"970436\",\"account_number\":\"1234567890\",\"account_holder_name\":\"NGUYEN VAN A\",\"account_type\":\"personal\"}";}
 @Test void readsOnlySafeBankMetadataAndCallsFixedHostWithBearerToken()throws Exception{
  response(200,"{\"status\":\"success\",\"data\":["+bank()+"],\"meta\":{\"pagination\":{\"has_more\":true}}}");var result=client.banks("test-token",1);assertEquals("Vietcombank",result.items().get(0).bank());assertTrue(result.hasMore());
  var request=org.mockito.ArgumentCaptor.forClass(HttpRequest.class);verify(http).send(request.capture(),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any());assertEquals("userapi.sepay.vn",request.getValue().uri().getHost());assertEquals("Bearer test-token",request.getValue().headers().firstValue("Authorization").orElseThrow());
 }
 @Test void badCredentialsMalformedOversizedOrRedirectResponsesAreRejected()throws Exception{
  for(int code:new int[]{401,403,429,302,500}){response(code,"{}");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));}
  response(200,"bad json");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));response(200,"x".repeat(262145));assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));
 }
 @Test void newlineTokenNeverReachesProvider()throws Exception{assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("token\r\ninjected",1));verifyNoInteractions(http);}
 @Test void filtersInactiveAccountsAndRejectsForeignOrDynamicVa()throws Exception{
  response(200,"{\"status\":\"success\",\"data\":["+bank().replace("\"active\":1","\"active\":0")+"]}");assertTrue(client.banks("test-token",1).items().isEmpty());
  response(200,"{\"status\":\"success\",\"data\":{\"id\":\"va-1\",\"va\":\"96247123456\",\"active\":1,\"official\":1,\"static\":0,\"bank_account_id\":\"bank-1\"}}");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.va("test-token","bank-1","va-1"));
 }
}

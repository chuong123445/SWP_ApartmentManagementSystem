package com.ancu.proptech.service.payment;
import org.junit.jupiter.api.*;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class SepayBankClientTests {
 SepayBankClient client;HttpURLConnection connection;
 @BeforeEach void setup()throws Exception{client=spy(new SepayBankClient(JsonMapper.builder().build(),"live"));connection=mock(HttpURLConnection.class);doReturn(connection).when(client).open(any(URI.class));}
 void response(int status,String body)throws Exception{when(connection.getResponseCode()).thenReturn(status);when(connection.getInputStream()).thenAnswer(i->new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));}
 String bank(){return "{\"id\":\"bank-1\",\"active\":1,\"bank_short_name\":\"Vietcombank\",\"bank_bin\":\"970436\",\"account_number\":\"1234567890\",\"account_holder_name\":\"NGUYEN VAN A\",\"account_type\":\"personal\"}";}
 @Test void readsOnlySafeBankMetadataAndCallsFixedHostWithBearerToken()throws Exception{
  response(200,"{\"status\":\"success\",\"data\":["+bank()+"],\"meta\":{\"pagination\":{\"has_more\":true}}}");var result=client.banks("test-token",1);assertEquals("Vietcombank",result.items().get(0).bank());assertTrue(result.hasMore());
  var request=org.mockito.ArgumentCaptor.forClass(URI.class);verify(client).open(request.capture());assertEquals("userapi.sepay.vn",request.getValue().getHost());verify(connection).setRequestProperty("Authorization","Bearer test-token");verify(connection).setInstanceFollowRedirects(false);verify(connection).setReadTimeout(10000);verify(connection).disconnect();
 }
 @Test void badCredentialsMalformedOversizedOrRedirectResponsesAreRejected()throws Exception{
  for(int code:new int[]{401,403,429,302,500}){response(code,"{}");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));}
  response(200,"bad json");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));response(200,"x".repeat(262145));assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("test-token",1));
 }
 @Test void newlineTokenNeverReachesProvider()throws Exception{assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.banks("token\r\ninjected",1));verifyNoInteractions(connection);}
 @Test void filtersInactiveAccountsAndRejectsForeignOrDynamicVa()throws Exception{
  response(200,"{\"status\":\"success\",\"data\":["+bank().replace("\"active\":1","\"active\":0")+"]}");assertTrue(client.banks("test-token",1).items().isEmpty());
  response(200,"{\"status\":\"success\",\"data\":{\"id\":\"va-1\",\"va\":\"96247123456\",\"active\":1,\"official\":1,\"static\":0,\"bank_account_id\":\"bank-1\"}}");assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->client.va("test-token","bank-1","va-1"));
 }
 @Test void realTransportCanInitializeWithoutSelectorLoopback()throws Exception{
  var actual=new SepayBankClient(JsonMapper.builder().build(),"live");var connection=actual.open(URI.create("https://userapi.sepay.vn/v2/bank-accounts"));assertNotNull(connection);connection.disconnect();
 }

}

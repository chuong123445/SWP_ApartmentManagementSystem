package com.ancu.proptech.service.auth;
import com.ancu.proptech.config.auth.*;
import com.ancu.proptech.exception.auth.AuthException;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class Auth0AssetReaderTests {
    Auth0ManagementProperties management;VneidProperties vneid;MockRestServiceServer server;Auth0AssetReader reader;
    @BeforeEach void setup(){vneid=new VneidProperties();vneid.setEnabled(true);vneid.setIssuer("https://issuer.invalid/");
        management=new Auth0ManagementProperties();management.setClientId("m2m-test");management.setClientSecret("not-a-real-secret");
        var http=new RestTemplate();server=MockRestServiceServer.bindTo(http).build();reader=new Auth0AssetReader(vneid,management,http);}
    void token(){server.expect(requestTo("https://issuer.invalid/oauth/token")).andExpect(method(HttpMethod.POST))
            .andExpect(content().json("{\"grant_type\":\"client_credentials\",\"client_id\":\"m2m-test\",\"client_secret\":\"not-a-real-secret\",\"audience\":\"https://issuer.invalid/api/v2/\",\"scope\":\"read:users\"}"))
            .andRespond(withSuccess("{\"access_token\":\"management-test-token\",\"expires_in\":3600}",MediaType.APPLICATION_JSON));}
    void profile(String body){server.expect(requestTo("https://issuer.invalid/api/v2/users/auth0%7Cfixture?fields=app_metadata&include_fields=true"))
            .andExpect(method(HttpMethod.GET)).andExpect(header("Authorization","Bearer management-test-token")).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));}
    static String asset(){return "{\"external_asset_id\":\"asset-1\",\"name\":\"Căn hộ\",\"address\":\"Đà Nẵng\",\"property_mode\":\"SINGLE_UNIT\",\"right_type\":\"OWNERSHIP\",\"ownership_type\":\"SOLE_OWNER\",\"certificate\":{\"number\":\"CERT-1\"},\"units\":[{\"external_unit_id\":\"unit-1\",\"code\":\"A101\",\"floor_area_m2\":65}]}";}
    @Test void readsOnlyLinkedUserAppMetadataAndCountsUniqueRentableAssets(){token();profile("{\"app_metadata\":{\"vneid\":{\"assets\":["+asset()+","+asset()+"]}}}");assertEquals(java.util.List.of("asset-1"),reader.rentableAssets(vneid.getIssuer(),"auth0|fixture"));server.verify();}
    @Test void ignoresUserMetadataAndIncompleteAssets(){token();profile("{\"user_metadata\":{\"vneid\":{\"assets\":["+asset()+"]}},\"app_metadata\":{\"vneid\":{\"assets\":[{\"external_asset_id\":\"fake\"}]}}}");assertTrue(reader.rentableAssets(vneid.getIssuer(),"auth0|fixture").isEmpty());server.verify();}
    @Test void rejectsMissingCredentialsWithoutHttp(){management.setClientSecret("");assertFalse(reader.isConfigured());assertEquals("ASSET_SOURCE_UNAVAILABLE",assertThrows(AuthException.class,()->reader.rentableAssets(vneid.getIssuer(),"auth0|fixture")).code);server.verify();}
    @Test void rejectsAnotherIssuerWithoutHttp(){assertEquals("VNEID_LINK_CHANGED",assertThrows(AuthException.class,()->reader.rentableAssets("https://other.invalid/","auth0|fixture")).code);server.verify();}
    @Test void providerFailureIsUnavailableAndDoesNotLeakBody(){server.expect(requestTo("https://issuer.invalid/oauth/token")).andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("sensitive-provider-error"));var error=assertThrows(AuthException.class,()->reader.rentableAssets(vneid.getIssuer(),"auth0|fixture"));assertEquals("ASSET_SOURCE_UNAVAILABLE",error.code);assertFalse(error.getMessage().contains("sensitive"));server.verify();}
    @Test void malformedAssetListIsNotAccepted(){token();profile("{\"app_metadata\":{\"vneid\":{\"assets\":\"not-a-list\"}}}");assertEquals("ASSET_SOURCE_INVALID",assertThrows(AuthException.class,()->reader.rentableAssets(vneid.getIssuer(),"auth0|fixture")).code);server.verify();}
}

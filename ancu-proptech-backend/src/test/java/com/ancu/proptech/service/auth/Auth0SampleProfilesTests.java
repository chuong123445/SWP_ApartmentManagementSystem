package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class Auth0SampleProfilesTests {
    final ObjectMapper json=new ObjectMapper();
    @SuppressWarnings("unchecked") List<Map<String,Object>> profiles()throws Exception{return (List<Map<String,Object>>)(List<?>)json.readValue(Files.readString(Path.of("../docs/samples/auth0/users.json")),List.class);}
    @SuppressWarnings("unchecked") Map<String,Object> metadata(Map<String,Object> user){return (Map<String,Object>)((Map<?,?>)user.get("app_metadata")).get("vneid");}

    @Test void allTenProfilesAreReadByTheRealAdapterWithoutFilteringAnyAssets()throws Exception{
        var profiles=profiles();var config=new VneidProperties();config.setEnabled(true);config.setIssuer("https://profiles.invalid/");
        var management=new Auth0ManagementProperties();management.setClientId("fixture-m2m");management.setClientSecret("not-a-real-secret");
        var http=new RestTemplate();var server=MockRestServiceServer.bindTo(http).build();
        server.expect(requestTo("https://profiles.invalid/oauth/token")).andExpect(method(HttpMethod.POST)).andRespond(withSuccess("{\"access_token\":\"fixture-token\",\"expires_in\":3600}",MediaType.APPLICATION_JSON));
        for(int i=0;i<profiles.size();i++)server.expect(requestTo("https://profiles.invalid/api/v2/users/auth0%7Cprofile-"+i+"?fields=app_metadata&include_fields=true")).andExpect(header("Authorization","Bearer fixture-token")).andRespond(withSuccess(json.writeValueAsString(profiles.get(i)),MediaType.APPLICATION_JSON));
        var reader=new Auth0AssetReader(config,management,http);int assets=0,units=0;
        for(int i=0;i<profiles.size();i++){
            var result=reader.assetDetails(config.getIssuer(),"auth0|profile-"+i);
            assertEquals(((List<?>)metadata(profiles.get(i)).get("assets")).size(),result.size());assets+=result.size();
            for(var asset:result){assertTrue(asset.name().length()<=150);assertTrue(asset.address().length()<=300);assertTrue(asset.units().size()<=50);if(asset.rentalMode().equals("SINGLE_UNIT"))assertEquals(1,asset.units().size());units+=asset.units().size();}
        }
        assertEquals(10,profiles.size());assertEquals(21,assets);assertEquals(43,units);server.verify();
    }

    @Test void citizensAndGlobalAssetUnitIdsAreDistinctAndProfilesContainNoCredentials()throws Exception{
        var emails=new HashSet<>();var numbers=new HashSet<>();var assets=new HashSet<>();var units=new HashSet<>();
        var dates=DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);
        for(var user:profiles()){
            assertTrue(emails.add(user.get("email")));assertEquals(false,user.get("email_verified"));assertFalse(user.containsKey("password"));assertFalse(user.containsKey("password_hash"));assertFalse(user.containsKey("role"));
            var vneid=metadata(user);var citizen=(Map<?,?>)vneid.get("citizen");var number=(String)citizen.get("cccd_number");
            assertTrue(number.matches("999[0-9]{9}"));assertTrue(numbers.add(number));assertEquals(user.get("name"),citizen.get("full_name"));assertFalse(LocalDate.parse((String)citizen.get("dob"),dates).isAfter(LocalDate.now()));
            for(Object raw:(List<?>)vneid.get("assets")){var asset=(Map<?,?>)raw;assertTrue(assets.add(asset.get("external_asset_id")));for(Object item:(List<?>)asset.get("units")){var unit=(Map<?,?>)item;assertTrue(units.add(unit.get("external_unit_id")));assertInstanceOf(Number.class,unit.get("floor_area_m2"));var area=new BigDecimal(unit.get("floor_area_m2").toString());assertTrue(area.signum()>0);assertTrue(area.scale()<=2);}}
        }
        assertEquals(10,emails.size());assertEquals(21,assets.size());assertEquals(43,units.size());
    }
}

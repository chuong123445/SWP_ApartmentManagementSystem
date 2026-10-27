package com.ancu.proptech.service.auth;

import com.ancu.proptech.config.auth.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
import static com.ancu.proptech.service.auth.AccountService.error;

/** Đọc đúng user_id đã liên kết, không tìm user theo email hoặc nhận danh sách từ client. */
@Component
public class Auth0AssetReader {
    private final VneidProperties vneid;
    private final Auth0ManagementProperties config;
    private final RestOperations http;
    private volatile String token;
    private volatile Instant tokenExpires=Instant.EPOCH;
    @Autowired public Auth0AssetReader(VneidProperties vneid,Auth0ManagementProperties config){this(vneid,config,httpClient());}
    Auth0AssetReader(VneidProperties vneid,Auth0ManagementProperties config,RestOperations http){this.vneid=vneid;this.config=config;this.http=http;}
    public boolean isConfigured(){return vneid.isEnabled()&&!vneid.getIssuer().isBlank()&&!config.getClientId().isBlank()&&!config.getClientSecret().isBlank();}
    public List<String> rentableAssets(String issuer,String subject){
        if(!isConfigured())throw unavailable();
        if(!issuer.equals(vneid.getIssuer())||subject==null||subject.isBlank())throw error(HttpStatus.CONFLICT,"VNEID_LINK_CHANGED","Liên kết VNeID không còn phù hợp với nguồn dữ liệu.");
        URI uri=UriComponentsBuilder.fromUriString(issuer).pathSegment("api","v2","users",subject)
                .queryParam("fields","app_metadata").queryParam("include_fields",true).build().encode().toUri();
        try{
            var headers=new HttpHeaders();headers.setBearerAuth(accessToken());
            Map<?,?> profile=http.exchange(uri,HttpMethod.GET,new HttpEntity<>(headers),Map.class).getBody();
            Map<?,?> metadata=map(profile==null?null:profile.get("app_metadata"));
            Object raw=map(metadata.get("vneid")).get("assets");
            if(raw==null)return List.of();
            if(!(raw instanceof List<?> assets)||assets.size()>100)throw invalidData();
            var ids=new LinkedHashSet<String>();
            for(Object entry:assets){var asset=map(entry);if(validAsset(asset))ids.add((String)asset.get("external_asset_id"));}
            return List.copyOf(ids);
        }catch(RestClientException e){token=null;tokenExpires=Instant.EPOCH;throw unavailable();}
    }
    private synchronized String accessToken(){
        if(token!=null&&Instant.now().isBefore(tokenExpires))return token;
        var response=http.postForObject(vneid.getIssuer()+"oauth/token",Map.of("grant_type","client_credentials",
                "client_id",config.getClientId(),"client_secret",config.getClientSecret(),"audience",vneid.getIssuer()+"api/v2/","scope","read:users"),Map.class);
        if(response==null||!(response.get("access_token") instanceof String value)||value.isBlank()||!(response.get("expires_in") instanceof Number seconds)||seconds.longValue()<=0)throw unavailable();
        token=value;tokenExpires=Instant.now().plusSeconds(Math.max(0,Math.min(seconds.longValue(),3600)-60));return token;
    }
    private static boolean validAsset(Map<?,?> asset){
        if(!text(asset.get("external_asset_id"),100)||!text(asset.get("name"),200)||!text(asset.get("address"),500)
                ||!"OWNERSHIP".equals(asset.get("right_type"))||!"SOLE_OWNER".equals(asset.get("ownership_type"))
                ||!Set.of("SINGLE_UNIT","MULTI_UNIT").contains(String.valueOf(asset.get("property_mode"))))return false;
        Map<?,?> certificate=map(asset.get("certificate"));
        if(!text(certificate.get("number"),100))return false;
        if(!(asset.get("units") instanceof List<?> units)||units.isEmpty()||units.size()>100)return false;
        return units.stream().map(Auth0AssetReader::map).anyMatch(unit->text(unit.get("external_unit_id"),100)
                &&text(unit.get("code"),100)&&positive(unit.get("floor_area_m2")));
    }
    private static boolean text(Object value,int max){return value instanceof String s&&!s.isBlank()&&s.length()<=max;}
    private static boolean positive(Object value){try{return value instanceof Number&&new BigDecimal(value.toString()).signum()>0;}catch(NumberFormatException e){return false;}}
    private static Map<?,?> map(Object value){return value instanceof Map<?,?> result?result:Map.of();}
    private static RestOperations httpClient(){var f=new SimpleClientHttpRequestFactory();f.setConnectTimeout(5000);f.setReadTimeout(5000);return new RestTemplate(f);}
    private static com.ancu.proptech.exception.auth.AuthException unavailable(){return error(HttpStatus.SERVICE_UNAVAILABLE,"ASSET_SOURCE_UNAVAILABLE","Chưa kết nối được nguồn tài sản Auth0. Vui lòng thử lại sau hoặc liên hệ quản trị viên.");}
    private static com.ancu.proptech.exception.auth.AuthException invalidData(){return error(HttpStatus.SERVICE_UNAVAILABLE,"ASSET_SOURCE_INVALID","Dữ liệu tài sản từ Auth0 không đúng định dạng được hỗ trợ.");}
}

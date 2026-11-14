package com.ancu.proptech.service.payment;
import com.ancu.proptech.dto.payment.SepayDtos.*;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.net.*;
import java.util.*;
@Component
public class SepayBankClient {
 private final ObjectMapper json;
 private final String base;
 public SepayBankClient(ObjectMapper json,@Value("${app.payment.sepay-mode:live}") String mode){this.json=json;this.base=switch(mode){case "live"->"https://userapi.sepay.vn/v2";case "sandbox"->"https://userapi-sandbox.sepay.vn/v2";default->throw new IllegalArgumentException("SePay mode must be live or sandbox");};}
 public BankPage banks(String token,int page){var body=get(token,"/bank-accounts?active=1&per_page=100&page="+page);var list=new ArrayList<BankAccount>();for(var n:body.path("data"))if(active(n))list.add(bank(n));return new BankPage(list,page,body.path("meta").path("pagination").path("has_more").asBoolean());}
 public BankAccount bank(String token,String id){var n=get(token,"/bank-accounts/"+id).path("data");if(!active(n))throw bad("Tài khoản SePay đã ngừng hoạt động.");return bank(n);}
 public VaPage vas(String token,String id,int page){var body=get(token,"/bank-accounts/"+id+"/va?active=1&official=1&static=1&per_page=100&page="+page);var list=new ArrayList<VirtualAccount>();for(var n:body.path("data"))if(active(n)&&n.path("official").asInt()==1&&n.path("static").asInt()==1)list.add(va(n));return new VaPage(list,page,body.path("meta").path("pagination").path("has_more").asBoolean());}
 public VirtualAccount va(String token,String bankId,String id){var n=get(token,"/bank-accounts/"+bankId+"/va/"+id).path("data");if(!active(n)||n.path("official").asInt()!=1||n.path("static").asInt()!=1||!bankId.equals(n.path("bank_account_id").asText()))throw bad("Cần chọn VA chính thức, tĩnh và đang hoạt động thuộc đúng tài khoản.");return va(n);}
 private static boolean active(JsonNode n){return n.path("active").asInt()==1;}
 private static BankAccount bank(JsonNode n){String bank=text(n,"bank_short_name",50),number=text(n,"account_number",30),holder=text(n,"account_holder_name",100),id=text(n,"id",64),bin=text(n,"bank_bin",10);if(!bank.matches("[A-Za-z0-9_-]{1,50}")||!number.matches("[A-Za-z0-9]{1,30}")||!bin.matches("[0-9]{6}"))throw bad("SePay trả về thông tin tài khoản chưa hợp lệ.");return new BankAccount(id,bank,bin,number,holder,n.path("account_type").asText());}
 private static VirtualAccount va(JsonNode n){return new VirtualAccount(text(n,"id",64),text(n,"va",34),n.path("sub_holder_name").asText());}
 private static String text(JsonNode n,String field,int max){String s=n.path(field).asText();if(s.isBlank()||s.length()>max)throw bad("SePay trả về thông tin tài khoản chưa đầy đủ.");return s;}
 private JsonNode get(String token,String path){
  if(token.isBlank()||token.length()>4096||!token.chars().allMatch(c->c>=33&&c<=126))throw bad("API Token không hợp lệ.");
  HttpURLConnection connection=null;
  try{
   connection=open(URI.create(base+path));connection.setConnectTimeout(5000);connection.setReadTimeout(10000);
   connection.setInstanceFollowRedirects(false);connection.setRequestMethod("GET");
   connection.setRequestProperty("Authorization","Bearer "+token);connection.setRequestProperty("Accept","application/json");
   int status=connection.getResponseCode();
   if(status==401||status==403)throw bad("SePay từ chối API Token. Kiểm tra token và chế độ Live/Test.");
   if(status==429)throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"SEPAY_RATE_LIMITED","SePay giới hạn tần suất. Chờ vài giây rồi thử lại.");
   if(status!=200)throw unavailable();
   try(var stream=connection.getInputStream()){
    byte[] data=stream.readNBytes(262145);if(data.length>262144)throw unavailable();var node=json.readTree(data);
    if(node==null||!"success".equals(node.path("status").asText())||!node.has("data"))throw unavailable();return node;
   }
  }catch(java.io.IOException|tools.jackson.core.JacksonException|IllegalArgumentException e){throw unavailable();}
  finally{if(connection!=null)connection.disconnect();}
 }
 // Dùng transport đồng bộ như adapter nguồn dữ liệu hiện có; tránh phụ thuộc selector/loopback của JDK HttpClient trên Windows.
 HttpURLConnection open(URI uri)throws java.io.IOException{return (HttpURLConnection)uri.toURL().openConnection();}
 private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"SEPAY_ACCOUNT_INVALID",message);}
 private static ApiException unavailable(){return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"SEPAY_UNAVAILABLE","Chưa đọc được tài khoản từ SePay. Vui lòng thử lại sau.");}
}

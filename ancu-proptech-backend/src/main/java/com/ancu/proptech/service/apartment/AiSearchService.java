package com.ancu.proptech.service.apartment;
import static com.ancu.proptech.dto.apartment.AiSearchDtos.*;
import com.ancu.proptech.service.ai.*;
import com.ancu.proptech.repository.ai.AssistanceRunRepository;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.*;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class AiSearchService {
 public static final String PROMPT="apartment-search-v1";
 private final AssistanceClient client;private final AssistanceAudit audit;private final AssistanceLimit limit;
 private final ApartmentService apartments;private final ObjectMapper json;private final Validator validator;private final AssistanceRunRepository runs;
 public Result suggest(Request input,String remote){
  try(var slot=limit.acquire("search:"+AssistanceAudit.hash(remote))){return generate(input,null).search();}
  catch(ApiException e){throw e;}catch(Exception e){throw invalid();}
 }
 public ChatResult chat(ChatRequest input,String remote){
  try(var slot=limit.acquire("search:"+AssistanceAudit.hash(remote))){return generate(new Request(input.text(),input.consent()),input.history());}
  catch(ApiException e){throw e;}catch(Exception e){throw invalid();}
 }
 private ChatResult generate(Request input,List<Message> history){
  boolean chat=history!=null;String prompt=chat?"apartment-chat-v2":PROMPT;
  var run=audit.start("APARTMENT_SEARCH",null,null,chat?json.writeValueAsString(List.of(input.text(),history)):input.text(),prompt);
  try{
   var addresses=apartments.addressOptions();
   var schema=json.readTree(new ClassPathResource("ai/"+(chat?"apartment-chat":"apartment-search")+".schema.json").getContentAsString(StandardCharsets.UTF_8));
   var instruction=new ClassPathResource("ai/"+prompt+".txt").getContentAsString(StandardCharsets.UTF_8);
   var out=client.generate(instruction,schema,Map.of("request",input.text(),"history",chat?history:List.of(),"publicAddressOptions",addresses));
   if(!out.isObject()||out.size()!=(chat?3:2)||!out.path("filters").isObject()||out.path("filters").size()!=10||!out.path("notes").isArray()||out.path("notes").size()>5)throw invalid();
   String reply=chat?out.path("reply").asString():"";
   if(chat&&(!out.path("reply").isString()||reply.isBlank()||reply.length()>2000))throw invalid();
   var f=json.treeToValue(out.path("filters"),Filters.class);validate(f);
   if(f.city()!=null&&!addresses.stream().anyMatch(a->a.city().equals(f.city())))throw invalid();
   if(f.district()!=null&&!addresses.stream().anyMatch(a->a.district().equals(f.district())&&(f.city()==null||a.city().equals(f.city()))))throw invalid();
   if(f.ward()!=null&&!addresses.stream().anyMatch(a->Objects.equals(a.ward(),f.ward())&&(f.city()==null||a.city().equals(f.city()))&&(f.district()==null||a.district().equals(f.district()))))throw invalid();
   var notes=new ArrayList<String>();for(var n:out.path("notes")){if(!n.isString()||n.asString().isBlank()||n.asString().length()>300)throw invalid();notes.add(n.asString());}
   boolean canApply=hasFilters(f);if(!chat&&!canApply&&notes.isEmpty())notes.add("Chưa xác định được bộ lọc. Hãy mô tả rõ khu vực, ngân sách hoặc diện tích.");
   var result=new Result(run.getId(),run.getSourceHash(),run.getModel(),prompt,run.getCreatedAt(),f,List.copyOf(notes),canApply);audit.finish(run.getId(),json.writeValueAsString(result),null);return new ChatResult(reply,result);
  }catch(ApiException e){audit.finish(run.getId(),null,e.code);throw e;}catch(Exception e){audit.finish(run.getId(),null,"AI_INVALID_RESPONSE");throw invalid();}
 }
 public void validate(Filters f){
  if(f==null||!validator.validate(f).isEmpty()||(f.minRent()!=null&&f.maxRent()!=null&&f.minRent().compareTo(f.maxRent())>0)||(f.minArea()!=null&&f.maxArea()!=null&&f.minArea().compareTo(f.maxArea())>0))throw invalid();
 }
 private boolean hasFilters(Filters f){return f.q()!=null&&!f.q().isBlank()||f.city()!=null||f.district()!=null||f.ward()!=null||f.minRent()!=null||f.maxRent()!=null||f.minArea()!=null||f.maxArea()!=null||f.bedrooms()!=null||f.occupants()!=null;}
 @Transactional public Filters apply(String id,Filters filters){
  validate(filters);if(!hasFilters(filters))throw invalid();
  var run=runs.lockById(id).filter(r->r.getTask().equals("APARTMENT_SEARCH")&&r.getStatus().equals("COMPLETED")&&r.getCreatedAt().isAfter(Instant.now().minusSeconds(900))).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"AI_RESULT_EXPIRED","Kết quả AI không còn hiệu lực. Hãy phân tích lại hoặc dùng bộ lọc thường."));
  String accepted=json.writeValueAsString(filters);
  if(run.getAcceptedAt()!=null&&!accepted.equals(run.getAcceptedJson()))throw new ApiException(HttpStatus.CONFLICT,"AI_RESULT_ALREADY_APPLIED","Đã áp dụng kết quả này. Hãy chỉnh trực tiếp bộ lọc thường hoặc phân tích lại.");
  run.setAcceptedAt(Instant.now());run.setAcceptedJson(accepted);runs.saveAndFlush(run);return filters;
 }
 private static ApiException invalid(){return GeminiAssistanceClient.failure("AI_INVALID_RESPONSE");}
}

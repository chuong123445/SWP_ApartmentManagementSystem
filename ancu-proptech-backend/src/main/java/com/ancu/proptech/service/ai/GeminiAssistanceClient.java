package com.ancu.proptech.service.ai;

import com.ancu.proptech.config.property.DossierAiSettings;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@Component @RequiredArgsConstructor
public class GeminiAssistanceClient implements AssistanceClient {
    private final DossierAiSettings settings;private final ObjectMapper json;
    @Value("${app.assistance-ai.enabled:false}") private boolean enabled;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
    public JsonNode generate(String instruction,JsonNode schema,Object input){
        return generate(instruction,schema,input,List.of());
    }
    public JsonNode generate(String instruction,JsonNode schema,Object input,List<AssistanceClient.Image> images){
        if(!enabled||!settings.configured())throw failure("AI_NOT_CONFIGURED");
        var uri=URI.create(settings.getBaseUrl()+"/models/"+settings.getModel()+":generateContent");
        if(!"https".equals(uri.getScheme())&&!Set.of("localhost","127.0.0.1").contains(uri.getHost()))throw failure("AI_NOT_CONFIGURED");
        var generation=new LinkedHashMap<String,Object>();generation.put("temperature",0);generation.put("maxOutputTokens",4096);generation.put("responseMimeType","application/json");generation.put("responseJsonSchema",schema);
        if(settings.getModel().startsWith("gemini-2.5-flash"))generation.put("thinkingConfig",Map.of("thinkingBudget",0));
        GeminiGenerationConfig.adapt(generation,settings.getModel());
        if(images.size()>4||images.stream().anyMatch(i->!Set.of("image/png","image/jpeg").contains(i.mimeType())||i.content().length>2_000_000))throw failure("AI_INVALID_IMAGES");
        var userParts=new ArrayList<Map<String,Object>>();
        userParts.add(Map.of("text",json.writeValueAsString(input)));
        for(var image:images)userParts.add(Map.of("inlineData",Map.of("mimeType",image.mimeType(),"data",Base64.getEncoder().encodeToString(image.content()))));
        var payload=Map.of("systemInstruction",Map.of("parts",List.of(Map.of("text",instruction))),"contents",List.of(Map.of("role","user","parts",userParts)),"generationConfig",generation);
        try{
            var req=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(45)).header("Content-Type","application/json").header("x-goog-api-key",settings.getApiKey()).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
            var response=http.send(req,HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()){
                if(response.statusCode()!=200)throw failure(switch(response.statusCode()) {
                    case 400 -> "AI_REQUEST_REJECTED";
                    case 401,403 -> "AI_PROVIDER_AUTH";
                    case 404 -> "AI_MODEL_UNAVAILABLE";
                    case 429 -> "AI_RATE_LIMIT";
                    case 503,504 -> "AI_PROVIDER_BUSY";
                    default -> "AI_PROVIDER_ERROR";
                });
                byte[] bytes=body.readNBytes(256001);if(bytes.length>256000)throw failure("AI_INVALID_RESPONSE");
                var candidate=json.readTree(bytes).path("candidates").path(0);if(!"STOP".equals(candidate.path("finishReason").asString()))throw failure("AI_INCOMPLETE");
                var text=new StringBuilder();for(var part:candidate.path("content").path("parts"))if(!part.path("thought").asBoolean(false)&&part.path("text").isString())text.append(part.path("text").asString());
                if(text.isEmpty())throw failure("AI_INVALID_RESPONSE");return json.readTree(text.toString());
            }
        }catch(ApiException e){throw e;}catch(InterruptedException e){Thread.currentThread().interrupt();throw failure("AI_TIMEOUT");}catch(Exception e){throw failure("AI_UNAVAILABLE");}
    }
    public static ApiException failure(String code){
        String message=switch(code) {
            case "AI_MODEL_UNAVAILABLE" -> "Model Gemini đang cấu hình không khả dụng với API key hiện tại. Cần kiểm tra GEMINI_MODEL.";
            case "AI_PROVIDER_AUTH" -> "Gemini từ chối xác thực hoặc quyền truy cập. Cần kiểm tra API key và quyền của project.";
            case "AI_REQUEST_REJECTED" -> "Gemini từ chối định dạng yêu cầu. Cần kiểm tra cấu hình và tham số tương thích với model.";
            case "AI_PROVIDER_BUSY" -> "Dịch vụ Gemini đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau.";
            case "AI_RATE_LIMIT" -> "Gemini đang giới hạn lượt gọi hoặc hạn mức. Vui lòng thử lại sau.";
            case "AI_NOT_CONFIGURED" -> "Chức năng AI chưa được bật hoặc thiếu cấu hình key/model.";
            default -> "AI chưa sẵn sàng hoặc chưa trả kết quả hợp lệ.";
        };
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,code,message);
    }
}

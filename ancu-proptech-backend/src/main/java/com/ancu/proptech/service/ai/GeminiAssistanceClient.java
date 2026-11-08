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
        if(!enabled||!settings.configured())throw failure("AI_NOT_CONFIGURED");
        var uri=URI.create(settings.getBaseUrl()+"/models/"+settings.getModel()+":generateContent");
        if(!"https".equals(uri.getScheme())&&!Set.of("localhost","127.0.0.1").contains(uri.getHost()))throw failure("AI_NOT_CONFIGURED");
        var generation=new LinkedHashMap<String,Object>();generation.put("temperature",0);generation.put("maxOutputTokens",4096);generation.put("responseMimeType","application/json");generation.put("responseJsonSchema",schema);
        if(settings.getModel().startsWith("gemini-2.5-flash"))generation.put("thinkingConfig",Map.of("thinkingBudget",0));
        var userParts=List.of(Map.of("text",json.writeValueAsString(input)));
        var payload=Map.of("systemInstruction",Map.of("parts",List.of(Map.of("text",instruction))),"contents",List.of(Map.of("role","user","parts",userParts)),"generationConfig",generation);
        try{
            var req=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(45)).header("Content-Type","application/json").header("x-goog-api-key",settings.getApiKey()).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
            var response=http.send(req,HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()){
                if(response.statusCode()!=200)throw failure(response.statusCode()==429?"AI_RATE_LIMIT":"AI_PROVIDER_ERROR");
                byte[] bytes=body.readNBytes(256001);if(bytes.length>256000)throw failure("AI_INVALID_RESPONSE");
                var candidate=json.readTree(bytes).path("candidates").path(0);if(!"STOP".equals(candidate.path("finishReason").asString()))throw failure("AI_INCOMPLETE");
                var text=new StringBuilder();for(var part:candidate.path("content").path("parts"))if(!part.path("thought").asBoolean(false)&&part.path("text").isString())text.append(part.path("text").asString());
                if(text.isEmpty())throw failure("AI_INVALID_RESPONSE");return json.readTree(text.toString());
            }
        }catch(ApiException e){throw e;}catch(InterruptedException e){Thread.currentThread().interrupt();throw failure("AI_TIMEOUT");}catch(Exception e){throw failure("AI_UNAVAILABLE");}
    }
    public static ApiException failure(String code){return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,code,"AI chưa sẵn sàng hoặc chưa trả kết quả hợp lệ. Bạn vẫn có thể sử dụng bộ lọc thông thường.");}
}

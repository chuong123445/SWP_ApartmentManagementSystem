package com.ancu.proptech.service.property.ai;

import com.ancu.proptech.config.property.DossierAiSettings;
import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.io.*;

@Component
public class GeminiDossierAiClient implements DossierAiClient {
    private final DossierAiSettings settings;private final ObjectMapper json;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final String instruction;private final JsonNode schema;
    public GeminiDossierAiClient(DossierAiSettings settings,ObjectMapper json)throws IOException{
        this.settings=settings;this.json=json;
        instruction=new ClassPathResource("ai/dossier-review-v1.txt").getContentAsString(StandardCharsets.UTF_8);
        schema=json.readTree(new ClassPathResource("ai/dossier-file-review.schema.json").getContentAsString(StandardCharsets.UTF_8));
    }
    @Override public DossierAiReport.FileReview analyze(JsonNode declarations,Document document){
        if(!settings.configured())throw new Failure("CONFIGURATION_MISSING",false);
        if(document.content().length>10*1024*1024 || !Set.of("image/png","image/jpeg","application/pdf").contains(document.mimeType()))throw new Failure("INVALID_SOURCE",false);
        var uri=URI.create(settings.getBaseUrl()+"/models/"+settings.getModel()+":generateContent");
        if(!"https".equals(uri.getScheme())&&!Set.of("127.0.0.1","localhost").contains(uri.getHost()))throw new Failure("CONFIGURATION_INVALID",false);
        String data=json.writeValueAsString(Map.of("declaredFields",declarations,"fileId",document.id(),"purpose",document.purpose(),"filename",document.filename()));
        var parts=List.of(Map.of("text",data),Map.of("inlineData",Map.of("mimeType",document.mimeType(),"data",Base64.getEncoder().encodeToString(document.content()))));
        var payload=Map.of("systemInstruction",Map.of("parts",List.of(Map.of("text",instruction))),"contents",List.of(Map.of("role","user","parts",parts)),
            "generationConfig",Map.of("temperature",0,"maxOutputTokens",4096,"responseMimeType","application/json","responseJsonSchema",schema));
        var request=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(60)).header("Content-Type","application/json").header("x-goog-api-key",settings.getApiKey()).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
        try{
            var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()){
                int code=response.statusCode();if(code!=200)throw new Failure(code==429?"RATE_LIMIT":code==401||code==403?"PROVIDER_AUTH":"PROVIDER_ERROR",code==429||code>=500);
                byte[] bytes=body.readNBytes(1_000_001);if(bytes.length>1_000_000)throw new Failure("INVALID_RESPONSE",false);
                var candidate=json.readTree(bytes).path("candidates").path(0);
                if(!"STOP".equals(candidate.path("finishReason").asString()))throw new Failure("PROVIDER_INCOMPLETE",false);
                var text=new StringBuilder();for(var part:candidate.path("content").path("parts")){if(!part.path("thought").asBoolean(false)&&part.path("text").isString())text.append(part.path("text").asString());}
                if(text.isEmpty())throw new Failure("INVALID_RESPONSE",false);
                return DossierAiReport.parse(json.readTree(text.toString()),document.id());
            }
        }catch(Failure e){throw e;}catch(InterruptedException e){Thread.currentThread().interrupt();throw new Failure("PROVIDER_TIMEOUT",true);}
        catch(IOException e){throw new Failure("PROVIDER_UNAVAILABLE",true);}catch(RuntimeException e){throw new Failure("INVALID_RESPONSE",false);}
    }
}

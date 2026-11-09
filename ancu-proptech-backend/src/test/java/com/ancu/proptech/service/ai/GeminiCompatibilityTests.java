package com.ancu.proptech.service.ai;

import com.ancu.proptech.config.property.DossierAiSettings;
import com.ancu.proptech.exception.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;
import java.io.*;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeminiCompatibilityTests {
    @Test void gemini3UsesThinkingLevelAndOmitsDeprecatedTemperature(){
        var config=new LinkedHashMap<String,Object>();config.put("temperature",0);config.put("maxOutputTokens",4096);config.put("responseMimeType","application/json");
        GeminiGenerationConfig.adapt(config,"gemini-3.5-flash-lite");
        assertFalse(config.containsKey("temperature"));assertEquals(Map.of("thinkingLevel","low"),config.get("thinkingConfig"));
        assertEquals(4096,config.get("maxOutputTokens"));assertEquals("application/json",config.get("responseMimeType"));
    }
    @Test void legacyFlashRetainsItsExistingBudgetAndTokenLimit(){
        var config=new LinkedHashMap<String,Object>();config.put("temperature",0);config.put("maxOutputTokens",16384);config.put("thinkingConfig",Map.of("thinkingBudget",1024));
        var before=new LinkedHashMap<>(config);GeminiGenerationConfig.adapt(config,"gemini-2.5-flash");assertEquals(before,config);
    }
    @Test @SuppressWarnings("unchecked") void providerFailuresHaveActionableCodesWithoutRawBodies()throws Exception{
        var settings=new DossierAiSettings();settings.setEnabled(true);settings.setApiKey("synthetic-private-key");settings.setModel("gemini-3.8-flash");
        var client=mock(GeminiAssistanceClient.class,CALLS_REAL_METHODS);ReflectionTestUtils.setField(client,"settings",settings);ReflectionTestUtils.setField(client,"json",JsonMapper.builder().build());ReflectionTestUtils.setField(client,"enabled",true);
        var http=mock(HttpClient.class);ReflectionTestUtils.setField(client,"http",http);
        HttpResponse<InputStream> response=mock(HttpResponse.class);when(http.send(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any())).thenReturn(response);
        when(response.body()).thenAnswer(call->new ByteArrayInputStream("provider-private-body".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        var expected=Map.of(400,"AI_REQUEST_REJECTED",401,"AI_PROVIDER_AUTH",403,"AI_PROVIDER_AUTH",404,"AI_MODEL_UNAVAILABLE",429,"AI_RATE_LIMIT",503,"AI_PROVIDER_BUSY",504,"AI_PROVIDER_BUSY",500,"AI_PROVIDER_ERROR");
        for(var entry:expected.entrySet()){
            when(response.statusCode()).thenReturn(entry.getKey());var failure=assertThrows(ApiException.class,()->client.generate("system",JsonMapper.builder().build().readTree("{}"),"test"));
            assertEquals(entry.getValue(),failure.code);assertFalse(failure.getMessage().contains("synthetic-private-key"));assertFalse(failure.getMessage().contains("provider-private-body"));
        }
    }
}

package com.ancu.proptech.service.ai;

import java.util.Map;

public final class GeminiGenerationConfig {
    private GeminiGenerationConfig() {}

    public static void adapt(Map<String,Object> config,String model) {
        if(model.startsWith("gemini-3")) {
            config.remove("temperature");
            config.put("thinkingConfig",Map.of("thinkingLevel","low"));
        }
    }
}

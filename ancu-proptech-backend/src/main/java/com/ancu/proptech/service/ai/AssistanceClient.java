package com.ancu.proptech.service.ai;
import tools.jackson.databind.JsonNode;
public interface AssistanceClient {
    JsonNode generate(String instruction,JsonNode schema,Object input);
    record Image(String mimeType, byte[] content) {}
    default JsonNode generate(String instruction,JsonNode schema,Object input,java.util.List<Image> images) {
        if(!images.isEmpty())throw GeminiAssistanceClient.failure("AI_IMAGES_UNSUPPORTED");
        return generate(instruction,schema,input);
    }
}

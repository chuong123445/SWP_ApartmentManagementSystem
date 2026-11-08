package com.ancu.proptech.service.ai;
import tools.jackson.databind.JsonNode;
public interface AssistanceClient {
    JsonNode generate(String instruction,JsonNode schema,Object input);
}

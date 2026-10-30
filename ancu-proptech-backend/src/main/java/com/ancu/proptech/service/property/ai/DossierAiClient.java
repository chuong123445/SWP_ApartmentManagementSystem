package com.ancu.proptech.service.property.ai;
import tools.jackson.databind.JsonNode;
public interface DossierAiClient {
    DossierAiReport.FileReview analyze(JsonNode declarations,Document document);
    record Document(String id,String purpose,String mimeType,String filename,byte[] content){}
    final class Failure extends RuntimeException {
        public final String code;public final boolean retryable;
        public Failure(String code,boolean retryable){super(code);this.code=code;this.retryable=retryable;}
    }
}

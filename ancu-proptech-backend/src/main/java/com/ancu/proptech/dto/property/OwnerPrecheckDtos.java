package com.ancu.proptech.dto.property;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;
import java.util.List;
import java.time.Instant;
public final class OwnerPrecheckDtos {
 private OwnerPrecheckDtos(){}
 public record Request(@NotNull PropertyDossierSubmit draft,Long fileId,@Size(max=64) String sourceHash,Boolean consent){}
 public record File(String id,String filename,String purpose){}
 public record View(String sourceHash,long propertyVersion,List<String> checklist,List<File> files,String runId,String model,String promptVersion,Instant finishedAt,JsonNode review){}
 public record Acknowledge(@NotNull PropertyDossierSubmit draft,@NotBlank @Size(max=64) String sourceHash){}
}

package com.ancu.proptech.dto.property;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;
import java.util.List;
import java.time.Instant;
public final class OwnerPrecheckDtos {
 private OwnerPrecheckDtos(){}
 public record Request(@NotNull PropertyDossierSubmit draft,Long fileId,@Size(max=64) String sourceHash,Boolean consent,@jakarta.validation.Valid PropertyFields propertyFields){}
 public record PropertyFields(@NotBlank @Size(max=150) String name,@NotBlank @Size(max=300) String address,@NotBlank @Size(max=80) String city,@NotBlank @Size(max=80) String district,@Size(max=80) String ward){}
 public record File(String id,String filename,String purpose){}
 public record View(String sourceHash,long propertyVersion,List<String> checklist,List<File> files,String runId,String model,String promptVersion,Instant finishedAt,JsonNode review){}
 public record Acknowledge(@NotNull PropertyDossierSubmit draft,@NotBlank @Size(max=64) String sourceHash,@jakarta.validation.Valid PropertyFields propertyFields){}
}

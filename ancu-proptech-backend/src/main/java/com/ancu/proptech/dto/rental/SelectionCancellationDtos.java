package com.ancu.proptech.dto.rental;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
public final class SelectionCancellationDtos {
 private SelectionCancellationDtos(){}
 public enum Action { START, ACCEPT, REJECT, WITHDRAW }
 public record Command(@NotNull Action action,@NotBlank @Pattern(regexp="[a-f0-9]{64}") String sourceVersion,@Size(max=2000) String reason){}
 public record Event(String id,String actorId,String actorName,String action,String reason,Instant createdAt,JsonNode before,JsonNode after){}
 public record View(String requestId,String contractId,String apartmentTitle,String requestStatus,String contractStatus,String signingState,String state,String proposerId,String reason,String responderId,String responseReason,String sourceVersion,boolean canStart,boolean canRespond,boolean canWithdraw,List<Event> history){}
}

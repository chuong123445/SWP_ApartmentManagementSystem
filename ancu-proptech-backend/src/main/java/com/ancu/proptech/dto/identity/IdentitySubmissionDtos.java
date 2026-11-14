package com.ancu.proptech.dto.identity;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
public final class IdentitySubmissionDtos {
 private IdentitySubmissionDtos(){}
 public record Submit(@NotNull @PositiveOrZero Long profileVersion,@AssertTrue Boolean consent) {}
 public record Decision(@NotNull @PositiveOrZero Long version,@NotNull Action action,@Size(max=2000) String reason) {}
 public enum Action { APPROVE, REJECT }
 public record View(String id,String accountId,IdentityProfileResponse profile,String status,Instant submittedAt,String reviewerId,Instant reviewedAt,String reason,long version) {}
 public record Listing(List<View> items,int page,int totalPages,long totalElements) {}
}

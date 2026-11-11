package com.ancu.proptech.dto.auth;
import jakarta.validation.constraints.*;
import java.time.Instant;
public final class ActionOtpDtos {
    private ActionOtpDtos() {}
    public record Challenge(String challengeId,String maskedEmail,Instant expiresAt) {}
    public record EmailInput(@NotBlank @Email @Size(max=254) String email) {}
    public record VerifyInput(@NotBlank @Size(max=36) String challengeId,@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    public record Proof(String challengeId,String resetToken,Instant expiresAt) {}
    public record ResetInput(@NotBlank @Size(max=36) String challengeId,@NotBlank @Size(max=100) String resetToken,
        @NotBlank @Size(min=12,max=72) String newPassword,@NotBlank @Size(max=72) String confirmPassword) {}
}

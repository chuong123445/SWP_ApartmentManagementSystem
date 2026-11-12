package com.ancu.proptech.dto.messaging;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class RentalMessagingDtos {
    private RentalMessagingDtos() {}

    public record Conversation(String id, String apartmentId, String apartmentTitle, String otherName, Instant lastMessageAt) {}
    public record Message(String id, boolean mine, String body, Instant sentAt) {}
    public record ThreadView(Conversation conversation, List<Message> messages, boolean hasMore) {}
    public record Send(@NotNull UUID requestKey, @NotBlank @Size(max = 2000) String body) {}
}

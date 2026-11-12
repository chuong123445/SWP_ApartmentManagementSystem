package com.ancu.proptech.repository.messaging;

import com.ancu.proptech.model.messaging.RentalMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalMessageRepository extends JpaRepository<RentalMessage, Long> {
    Optional<RentalMessage> findByConversationIdAndSenderIdAndRequestKey(Long conversationId, Long senderId, String requestKey);
    List<RentalMessage> findByConversationIdOrderByIdDesc(Long conversationId, Pageable page);
    List<RentalMessage> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long before, Pageable page);
    List<RentalMessage> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long after, Pageable page);
}

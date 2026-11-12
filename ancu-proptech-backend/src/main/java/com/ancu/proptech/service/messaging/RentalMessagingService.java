package com.ancu.proptech.service.messaging;

import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.dto.messaging.RentalMessagingDtos.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.messaging.RentalConversation;
import com.ancu.proptech.model.messaging.RentalMessage;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.messaging.RentalConversationRepository;
import com.ancu.proptech.repository.messaging.RentalMessageRepository;
import com.ancu.proptech.service.apartment.ApartmentService;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class RentalMessagingService {
    private static final int HISTORY_SIZE = 50;
    private final AccountAccessService access;
    private final AccountVerificationPolicy verification;
    private final ApartmentRepository apartments;
    private final RentalContractRepository contracts;
    private final RentalConversationRepository conversations;
    private final RentalMessageRepository messages;

    @Transactional
    public Conversation open(Jwt jwt, Long apartmentId) {
        var customer = access.customer(jwt);
        var apartment = apartments.findForRequest(apartmentId).orElseThrow(RentalMessagingService::missing);
        var owner = apartment.getProperty().getOwner();
        if (owner.getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "OWN_APARTMENT_MESSAGE", "Bạn không thể nhắn tin cho chính mình.");
        }
        var existing = conversations.findByApartmentIdAndCustomerIdAndOwnerId(apartmentId, customer.getId(), owner.getId());
        if (existing.isPresent() && existing.get().getLastMessageAt() != null) return view(existing.get(), customer);
        requireEligibleRoom(apartment, customer);
        if (existing.isPresent()) return view(existing.get(), customer);
        var conversation = new RentalConversation();
        conversation.setApartment(apartment);
        conversation.setCustomer(customer);
        conversation.setOwner(owner);
        return view(conversations.save(conversation), customer);
    }

    @Transactional(readOnly = true)
    public PageResponse<Conversation> inbox(Jwt jwt, int page, int size) {
        ApartmentService.validatePage(page, size);
        var account = access.account(jwt);
        Long customerId = canRent(account) ? account.getId() : null;
        Long ownerId = canLet(account) ? account.getId() : null;
        if (customerId == null && ownerId == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "MESSAGING_NOT_AVAILABLE", "Tài khoản chưa đủ điều kiện sử dụng tin nhắn.");
        }
        return PageResponse.from(conversations.inbox(customerId, ownerId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "lastMessageAt", "id"))).map(c -> view(c, account)));
    }

    @Transactional(readOnly = true)
    public ThreadView thread(Jwt jwt, Long id, Long before, Long after) {
        if ((before != null && before <= 0) || (after != null && after <= 0) || (before != null && after != null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "Mốc tải tin nhắn không hợp lệ.");
        }
        var account = access.account(jwt);
        var conversation = participant(conversations.findById(id).orElseThrow(RentalMessagingService::missing), account);
        var page = PageRequest.of(0, HISTORY_SIZE + 1);
        var rows = after != null ? messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(id, after, page)
            : before != null ? messages.findByConversationIdAndIdLessThanOrderByIdDesc(id, before, page)
            : messages.findByConversationIdOrderByIdDesc(id, page);
        var items = rows.stream().limit(HISTORY_SIZE).map(row -> message(row, account)).toList();
        return new ThreadView(view(conversation, account), after == null ? items.reversed() : items, rows.size() > HISTORY_SIZE);
    }

    @Transactional
    public Message send(Jwt jwt, Long id, Send input) {
        var account = access.account(jwt);
        var conversation = participant(conversations.lock(id, account.getId()).orElseThrow(RentalMessagingService::missing), account);
        String key = input.requestKey().toString();
        String body = input.body().strip();
        if (body.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_MESSAGE", "Hãy nhập nội dung tin nhắn.");
        var existing = messages.findByConversationIdAndSenderIdAndRequestKey(id, account.getId(), key);
        if (existing.isPresent()) {
            if (!body.equals(existing.get().getBody())) {
                throw new ApiException(HttpStatus.CONFLICT, "MESSAGE_KEY_REUSED", "Tin nhắn đã gửi có nội dung khác.");
            }
            return message(existing.get(), account);
        }
        if (!conversation.getOwner().getId().equals(conversation.getApartment().getProperty().getOwner().getId())
            || !canLet(conversation.getOwner()) || !canRent(conversation.getCustomer())) {
            throw new ApiException(HttpStatus.CONFLICT, "CONVERSATION_UNAVAILABLE", "Cuộc trò chuyện này hiện chỉ có thể xem lại.");
        }
        if (conversation.getLastMessageAt() == null) {
            if (!conversation.getCustomer().getId().equals(account.getId())) throw missing();
            requireEligibleRoom(conversation.getApartment(), account);
        }
        var row = new RentalMessage();
        row.setConversation(conversation);
        row.setSenderId(account.getId());
        row.setRequestKey(key);
        row.setBody(body);
        row.setSentAt(Instant.now());
        conversation.setLastMessageAt(row.getSentAt());
        return message(messages.save(row), account);
    }

    private RentalConversation participant(RentalConversation conversation, AuthAccount account) {
        if ((conversation.getCustomer().getId().equals(account.getId()) && canRent(account)) ||
            (conversation.getOwner().getId().equals(account.getId()) && canLet(account))) return conversation;
        throw missing();
    }

    private void requireEligibleRoom(Apartment apartment, AuthAccount customer) {
        if (canLet(apartment.getProperty().getOwner()) &&
            contracts.existsByApartmentIdAndCustomerIdAndStatus(apartment.getId(), customer.getId(), RentalContract.Status.ACTIVE)) {
            return;
        }
        if (apartment.getAvailability() != Apartment.Availability.VACANT ||
            !apartments.exists(ApartmentService.visible().and(ApartmentService.rightsEffective())
                .and((root, query, cb) -> cb.equal(root.get("id"), apartment.getId())))) throw missing();
    }

    private boolean canRent(AuthAccount account) {
        return account.getStatus() == AuthAccount.Status.ACTIVE && account.hasRole(AuthAccount.Role.CUSTOMER)
            && verification.isRentalVerified(account);
    }

    private boolean canLet(AuthAccount account) {
        return account.getStatus() == AuthAccount.Status.ACTIVE && account.hasRole(AuthAccount.Role.OWNER)
            && verification.isVerified(account);
    }

    private static Conversation view(RentalConversation c, AuthAccount account) {
        var other = c.getCustomer().getId().equals(account.getId()) ? c.getOwner() : c.getCustomer();
        return new Conversation(c.getId().toString(), c.getApartment().getId().toString(),
            c.getApartment().getTitle(), other.getFullName(), c.getLastMessageAt());
    }

    private static Message message(RentalMessage row, AuthAccount account) {
        return new Message(row.getId().toString(), row.getSenderId().equals(account.getId()), row.getBody(), row.getSentAt());
    }

    private static ApiException missing() {
        return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Không tìm thấy cuộc trò chuyện hoặc căn cho thuê.");
    }
}

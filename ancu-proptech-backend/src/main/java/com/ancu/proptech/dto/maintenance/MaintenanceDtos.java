package com.ancu.proptech.dto.maintenance;
import com.ancu.proptech.model.maintenance.MaintenanceTicket;
import java.time.Instant;
public final class MaintenanceDtos {
private MaintenanceDtos() {}
public enum Kind { BEFORE, AFTER, RECEIPT }
public record Image(String id,String kind) {}
public record ImageContent(byte[] content,String contentType) {}
    public record Create(Long propertyId,Long apartmentId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=200) String title,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=3000) String description,
        @jakarta.validation.constraints.NotNull MaintenanceTicket.Category category,
        @jakarta.validation.constraints.NotNull MaintenanceTicket.Priority priority) {}
    public record History(String action,String note,Instant createdAt) {}
    public record Ticket(String id,String propertyId,String apartmentId,String roomNumber,String reporterName,
                         String title,String description,String category,String priority,String status,Instant createdAt,long version,
                         String technicianName,String technicianPhone,Instant scheduledAt,boolean canConfirm,String repairResult,
                         String actualCost,String customerCost,String costResponsibility,java.util.List<History> history,java.util.List<Image> images) {}
    public enum CostResponsibility { OWNER, CUSTOMER, SHARED }
    public enum Action { ACCEPT, REJECT, ASSIGN, CANCEL, READY, CONFIRM, REOPEN }
    public record Change(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
        @jakarta.validation.constraints.NotNull Action action,@jakarta.validation.constraints.Size(max=3000) String note,
        @jakarta.validation.constraints.Size(max=200) String technicianName,
        @jakarta.validation.constraints.Pattern(regexp="[+0-9 ()-]{6,30}") String technicianPhone,Instant scheduledAt,
        @jakarta.validation.constraints.DecimalMin("0") @jakarta.validation.constraints.Digits(integer=13,fraction=2) java.math.BigDecimal actualCost,
        CostResponsibility costResponsibility,
        @jakarta.validation.constraints.DecimalMin("0") @jakarta.validation.constraints.Digits(integer=13,fraction=2) java.math.BigDecimal customerCost) {}
}

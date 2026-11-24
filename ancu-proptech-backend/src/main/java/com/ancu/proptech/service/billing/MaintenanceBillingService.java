package com.ancu.proptech.service.billing;

import com.ancu.proptech.dto.billing.MaintenanceChargeView;
import com.ancu.proptech.model.billing.*;
import com.ancu.proptech.repository.billing.MaintenanceChargeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service @RequiredArgsConstructor
public class MaintenanceBillingService {
    private final MaintenanceChargeRepository charges;
    private final tools.jackson.databind.ObjectMapper json;

    public List<MaintenanceChargeView> pending(Long contract,String period) {
        return period==null ? List.of() : charges.pending(contract,period).stream().map(this::view).toList();
    }
    public BigDecimal total(List<MaintenanceChargeView> items) {
        return items.stream().map(i->new BigDecimal(i.customerCost())).reduce(BigDecimal.ZERO,BigDecimal::add);
    }
    // Caller holds the contract lock throughout creation/cancellation.
    public void attach(RentalInvoice invoice) {
        var pending=charges.pending(invoice.getContract().getId(),invoice.getPeriod());
        if(pending.isEmpty())return;
        var items=new java.util.ArrayList<>(items(invoice));
        pending.stream().map(this::view).forEach(items::add);
        var previousAmount=invoice.getMaintenanceAmount();
        invoice.setMaintenanceAmount(total(items));
        invoice.setMaintenanceItemsJson(json.writeValueAsString(items));
        invoice.setTotalAmount(invoice.getTotalAmount().subtract(previousAmount).add(invoice.getMaintenanceAmount()));
        pending.forEach(charge->charge.setInvoice(invoice));
    }
    public void release(RentalInvoice invoice) {
        charges.findByInvoiceId(invoice.getId()).forEach(charge->charge.setInvoice(null));
    }
    public List<MaintenanceChargeView> items(RentalInvoice invoice) {
        var raw=invoice.getMaintenanceItemsJson();
        if(raw==null||raw.isBlank())return List.of();
        return json.readValue(raw,new tools.jackson.core.type.TypeReference<List<MaintenanceChargeView>>(){});
    }
    private MaintenanceChargeView view(MaintenanceCharge c) {
        return new MaintenanceChargeView(c.getTicketId().toString(),c.getTitle(),c.getPeriod(),
            c.getActualCost().toPlainString(),c.getActualCost().subtract(c.getCustomerCost()).toPlainString(),
            c.getCustomerCost().toPlainString());
    }
}

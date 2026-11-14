package com.ancu.proptech.dto.finance;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;
public record OwnerFinancialSummary(@JsonFormat(shape=JsonFormat.Shape.STRING) Long propertyId,int year,LocalDate asOf,
        Amounts totals,Receipts receipts,Arrears arrears,Inventory inventory,List<Month> months,List<Property> properties,String allocatedRentAmount) {
    public record Amounts(long invoiceCount,long paidInvoiceCount,long onTimePaidInvoiceCount,String billedAmount,String paidInvoiceAmount,
            String unpaidInvoiceAmount,String rentAmount,String electricityAmount,String waterAmount,String serviceAmount) {}
    public record Receipts(String monthlyInvoiceAmount,String additionalAmount,String totalAmount) {}
    public record Arrears(long monthlyInvoiceCount,String monthlyInvoiceAmount,long overdueInvoiceCount,String overdueInvoiceAmount,
            long additionalCount,String additionalAmount) {}
    public record Inventory(long units,long occupied,long vacant) {}
    public record Month(String period,Amounts invoices,Receipts receipts,String allocatedRentAmount) {}
    public record Property(@JsonFormat(shape=JsonFormat.Shape.STRING) Long id,String name,Inventory inventory,Amounts invoices,Receipts receipts,String allocatedRentAmount) {}
}

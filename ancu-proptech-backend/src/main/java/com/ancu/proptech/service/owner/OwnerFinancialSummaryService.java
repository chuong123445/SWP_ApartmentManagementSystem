package com.ancu.proptech.service.owner;

import com.ancu.proptech.dto.finance.*;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.repository.finance.FinancialReportRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.property.PropertyRightsPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class OwnerFinancialSummaryService {
    private static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private final AccountAccessService access;
    private final PropertyRepository properties;
    private final FinancialReportRepository reports;
    private final PropertyRightsPolicy dates;

    @Transactional(readOnly=true)
    public OwnerFinancialSummary read(Jwt jwt,Long propertyId,Integer requestedYear) {
        var ownerId=access.owner(jwt).getId();var today=dates.today();int year=requestedYear==null?today.getYear():requestedYear;
        if(year<1900||year>9998)throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_YEAR","Năm báo cáo phải từ 1900 đến 9998.");
        if(propertyId!=null)properties.findById(propertyId).filter(p->p.getOwner().getId().equals(ownerId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản thuộc tài khoản của bạn."));
        var inventory=reports.inventory(ownerId,propertyId);var byProperty=new LinkedHashMap<Long,Accumulator>();
        inventory.forEach(row->byProperty.put(row.propertyId(),new Accumulator()));
        var months=new LinkedHashMap<String,Accumulator>();for(int m=1;m<=12;m++)months.put(YearMonth.of(year,m).toString(),new Accumulator());
        var total=new Accumulator();long[] debtCounts={0,0,0};BigDecimal[] debt={BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO};
        try(var stream=reports.invoices(ownerId,propertyId)) {
            stream.forEach(row->{
                var property=byProperty.computeIfAbsent(row.propertyId(),id->new Accumulator());
                if(row.paidAt()==null){debtCounts[0]++;debt[0]=debt[0].add(row.total());if(row.dueDate().isBefore(today)){debtCounts[1]++;debt[1]=debt[1].add(row.total());}}
                var month=months.get(row.period());
                if(month!=null){total.invoice(row);month.invoice(row);property.invoice(row);}
                if(row.paidAt()!=null){var receivedMonth=months.get(YearMonth.from(row.paidAt().atZone(ZONE)).toString());if(receivedMonth!=null){total.received=total.received.add(row.received());receivedMonth.received=receivedMonth.received.add(row.received());property.received=property.received.add(row.received());}}
            });
        }
        var from=LocalDate.of(year,1,1).atStartOfDay(ZONE).toInstant();var until=LocalDate.of(year+1,1,1).atStartOfDay(ZONE).toInstant();
        try(var stream=reports.receipts(ownerId,propertyId,from,until)) {
            stream.forEach(row->{
                if(row.paidAt()==null){debtCounts[2]++;debt[2]=debt[2].add(row.amount());}
                else {var month=months.get(YearMonth.from(row.paidAt().atZone(ZONE)).toString());var property=byProperty.computeIfAbsent(row.propertyId(),id->new Accumulator());total.additional=total.additional.add(row.amount());month.additional=month.additional.add(row.amount());property.additional=property.additional.add(row.amount());}
            });
        }
        var units=new OwnerFinancialSummary.Inventory(inventory.stream().mapToLong(FinancialInventoryRow::units).sum(),inventory.stream().mapToLong(FinancialInventoryRow::occupied).sum(),inventory.stream().mapToLong(FinancialInventoryRow::vacant).sum());
        var propertyRows=inventory.stream().map(row->{var a=byProperty.get(row.propertyId());return new OwnerFinancialSummary.Property(row.propertyId(),row.name(),new OwnerFinancialSummary.Inventory(row.units(),row.occupied(),row.vacant()),a.amounts(),a.receipts());}).toList();
        return new OwnerFinancialSummary(propertyId,year,today,total.amounts(),total.receipts(),new OwnerFinancialSummary.Arrears(debtCounts[0],debt[0].toPlainString(),debtCounts[1],debt[1].toPlainString(),debtCounts[2],debt[2].toPlainString()),units,
                months.entrySet().stream().map(entry->new OwnerFinancialSummary.Month(entry.getKey(),entry.getValue().amounts(),entry.getValue().receipts())).toList(),propertyRows);
    }
    private static final class Accumulator {
        long count,paid,onTime;
        BigDecimal billed=BigDecimal.ZERO,settled=BigDecimal.ZERO,rent=BigDecimal.ZERO,electricity=BigDecimal.ZERO,water=BigDecimal.ZERO,services=BigDecimal.ZERO,received=BigDecimal.ZERO,additional=BigDecimal.ZERO;
        void invoice(FinancialInvoiceRow row){count++;billed=billed.add(row.total());rent=rent.add(row.rent());electricity=electricity.add(row.electricity());water=water.add(row.water());services=services.add(row.internet()).add(row.garbage());if(row.paidAt()!=null){paid++;settled=settled.add(row.total());if(!row.paidAt().atZone(ZONE).toLocalDate().isAfter(row.dueDate()))onTime++;}}
        OwnerFinancialSummary.Amounts amounts(){return new OwnerFinancialSummary.Amounts(count,paid,onTime,billed.toPlainString(),settled.toPlainString(),billed.subtract(settled).toPlainString(),rent.toPlainString(),electricity.toPlainString(),water.toPlainString(),services.toPlainString());}
        OwnerFinancialSummary.Receipts receipts(){return new OwnerFinancialSummary.Receipts(received.toPlainString(),additional.toPlainString(),received.add(additional).toPlainString());}
    }
}

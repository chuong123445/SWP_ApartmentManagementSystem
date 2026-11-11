package com.ancu.proptech.service.billing;

import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.contract.RentalContract;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;

final class RentSchedule {
    private RentSchedule() {}
    record Period(LocalDate start,LocalDate end,int months) {}
    static Period next(RentalContract contract,List<RentalInvoice> invoices) {
        LocalDate first=contract.getStartDate().withDayOfMonth(1);
        if(!first.equals(contract.getStartDate()))first=first.plusMonths(1);
        LocalDate endExclusive=contract.getEndDate().plusDays(1).withDayOfMonth(1);
        LocalDate next=first;
        for(var invoice:invoices){
            if(invoice.getKind()==RentalInvoice.Kind.UTILITY)continue;
            LocalDate end=invoice.getCoverageEnd()==null?YearMonth.parse(invoice.getPeriod()).atEndOfMonth():invoice.getCoverageEnd();
            if(!end.isBefore(next))next=end.plusDays(1).withDayOfMonth(1);
        }
        int months=(int)Math.min(contract.getRentCycleMonths(),ChronoUnit.MONTHS.between(next,endExclusive));
        return months<=0?null:new Period(next,next.plusMonths(months).minusDays(1),months);
    }
    static boolean partial(RentalContract c){return c.getStartDate().getDayOfMonth()!=1||!c.getEndDate().equals(YearMonth.from(c.getEndDate()).atEndOfMonth());}
}

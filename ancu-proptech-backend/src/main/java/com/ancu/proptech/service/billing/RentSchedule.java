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
        if(contract.isCalendarRentBilling())return nextCalendar(contract,invoices);
        if(contract.isOneMonthRentPackage()) {
            if(invoices.stream().anyMatch(i->i.getStatus()!=RentalInvoice.Status.CANCELLED && i.getKind()!=RentalInvoice.Kind.UTILITY))return null;
            return new Period(contract.getStartDate(),contract.getEndDate(),1);
        }
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
    static boolean partial(RentalContract c){return !c.isCalendarRentBilling()&&!c.isOneMonthRentPackage()&&(c.getStartDate().getDayOfMonth()!=1||!c.getEndDate().equals(YearMonth.from(c.getEndDate()).atEndOfMonth()));}
    private static Period nextCalendar(RentalContract c,List<RentalInvoice> history){
        var cursor=c.getStartDate();
        while(!cursor.isAfter(c.getEndDate())){
            var targetEnd=cursor.plusMonths(c.getRentCycleMonths()).minusDays(1);
            LocalDate end;
            int months;
            if(!targetEnd.isAfter(c.getEndDate())){
                end=targetEnd;
                months=c.getRentCycleMonths();
            } else {
                end=c.getEndDate();
                months=(int)ChronoUnit.MONTHS.between(YearMonth.from(cursor),YearMonth.from(end))+1;
            }
            var p=new Period(cursor,end,months);
            var overlap=history.stream().filter(i->i.getStatus()!=RentalInvoice.Status.CANCELLED&&i.getKind()!=RentalInvoice.Kind.UTILITY)
                .filter(i->!invoiceEnd(i).isBefore(p.start())&&!invoiceStart(i).isAfter(p.end())).toList();
            if(overlap.isEmpty())return p;
            if(overlap.size()!=1||!invoiceStart(overlap.getFirst()).equals(p.start())||!invoiceEnd(overlap.getFirst()).equals(p.end()))
                throw new com.ancu.proptech.exception.common.ApiException(org.springframework.http.HttpStatus.CONFLICT,"RENT_HISTORY_CONFLICT","Phạm vi hóa đơn cũ không khớp lịch thu đã thỏa thuận. Cần đối chiếu trước khi lập thêm.");
            cursor=p.end().plusDays(1);
        }
        return null;
    }
    private static LocalDate invoiceStart(RentalInvoice i){return i.getCoverageStart()==null?YearMonth.parse(i.getPeriod()).atDay(1):i.getCoverageStart();}
    private static LocalDate invoiceEnd(RentalInvoice i){return i.getCoverageEnd()==null?YearMonth.parse(i.getPeriod()).atEndOfMonth():i.getCoverageEnd();}
    private static boolean isFullCycle(RentalContract c,Period p){
        return p.start().plusMonths(c.getRentCycleMonths()).minusDays(1).equals(p.end());
    }
    // Rational day weights share a small exact denominator (LCM of month lengths).
    // Divide only once, after summing the entire rent period, to avoid per-month rounding drift.
    static java.math.BigDecimal amount(RentalContract c,Period p){
        if(!c.isCalendarRentBilling())return c.getMonthlyRent().multiply(java.math.BigDecimal.valueOf(p.months()));
        if(isFullCycle(c,p))return c.getMonthlyRent().multiply(java.math.BigDecimal.valueOf(c.getRentCycleMonths())).setScale(0,java.math.RoundingMode.HALF_UP);
        var base=java.math.BigInteger.ONE;
        for(var month=YearMonth.from(p.start());!month.isAfter(YearMonth.from(p.end()));month=month.plusMonths(1)){
            var length=java.math.BigInteger.valueOf(month.lengthOfMonth());base=base.divide(base.gcd(length)).multiply(length);
        }
        var weighted=java.math.BigDecimal.ZERO;
        for(var month=YearMonth.from(p.start());!month.isAfter(YearMonth.from(p.end()));month=month.plusMonths(1)){
            var from=month.atDay(1).isBefore(p.start())?p.start():month.atDay(1);var to=month.atEndOfMonth().isAfter(p.end())?p.end():month.atEndOfMonth();
            var days=ChronoUnit.DAYS.between(from,to)+1;
            weighted=weighted.add(c.getMonthlyRent().multiply(new java.math.BigDecimal(base.divide(java.math.BigInteger.valueOf(month.lengthOfMonth())))).multiply(java.math.BigDecimal.valueOf(days)));
        }
        return weighted.divide(new java.math.BigDecimal(base),0,java.math.RoundingMode.HALF_UP);
    }
    static String calculation(RentalContract c,Period p){
        if(!c.isCalendarRentBilling()||isFullCycle(c,p))return null;
        var lines=new java.util.ArrayList<String>();var format=java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        for(var month=YearMonth.from(p.start());!month.isAfter(YearMonth.from(p.end()));month=month.plusMonths(1)){
            var from=month.atDay(1).isBefore(p.start())?p.start():month.atDay(1);var to=month.atEndOfMonth().isAfter(p.end())?p.end():month.atEndOfMonth();
            lines.add(from.format(format)+"–"+to.format(format)+": "+c.getMonthlyRent().toPlainString()+" × "+(ChronoUnit.DAYS.between(from,to)+1)+"/"+month.lengthOfMonth());
        }
        return String.join("\n",lines)+"\nLàm tròn tổng tiền thuê đến đồng (0,5 làm tròn lên).";
    }
}

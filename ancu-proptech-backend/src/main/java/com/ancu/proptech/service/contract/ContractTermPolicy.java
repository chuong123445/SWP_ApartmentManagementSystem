package com.ancu.proptech.service.contract;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Dates include both the first and last rental day. */
public final class ContractTermPolicy {
    private ContractTermPolicy() {}
    public static boolean atLeast30Days(LocalDate start,LocalDate end) {
        return ChronoUnit.DAYS.between(start,end)+1>=30;
    }
    public static boolean oneMonthPackage(LocalDate start,LocalDate end) {
        return atLeast30Days(start,end) && (end.equals(start.plusDays(29)) || end.equals(start.plusMonths(1).minusDays(1)));
    }
    public static int wholeMonths(LocalDate start,LocalDate end) {
        if(oneMonthPackage(start,end)) return 1;
        LocalDate first=start.withDayOfMonth(1);
        if(!first.equals(start)) first=first.plusMonths(1);
        LocalDate endExclusive=end.plusDays(1).withDayOfMonth(1);
        if(!endExclusive.isAfter(first)) return 1;
        int months=(int)ChronoUnit.MONTHS.between(first,endExclusive);
        return Math.max(1, months);
    }
    public static int maxRentCycle(LocalDate start,LocalDate end) {
        if(oneMonthPackage(start,end)) return 1;
        return Math.min(12, wholeMonths(start,end));
    }
}

package com.ancu.proptech.service.contract;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;

/** Spells the stored amount without rounding it or inventing a fractional currency unit. */
final class VietnameseAmountWords {
    private static final String[] DIGITS={"không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"};
    private static final String[] GROUPS={"","nghìn","triệu","tỷ","nghìn tỷ","triệu tỷ","tỷ tỷ"};
    private VietnameseAmountWords() {}
    static String read(String input) {
        var amount=new BigDecimal(input).stripTrailingZeros();
        if(amount.signum()<0)throw new IllegalArgumentException("Amount must not be negative");
        String[] parts=amount.toPlainString().split("\\.");
        var integer=new BigInteger(parts[0]);var groups=new ArrayList<Integer>();
        while(integer.signum()>0){var split=integer.divideAndRemainder(BigInteger.valueOf(1000));groups.add(split[1].intValue());integer=split[0];}
        var words=new ArrayList<String>();
        for(int i=groups.size()-1;i>=0;i--)if(groups.get(i)>0){
            if(i>=GROUPS.length)throw new IllegalArgumentException("Amount exceeds supported contract precision");
            words.add(threeDigits(groups.get(i),i<groups.size()-1)+(i==0?"":" "+GROUPS[i]));
        }
        String value=words.isEmpty()?DIGITS[0]:String.join(" ",words);
        if(parts.length>1){value+=" phẩy";for(char digit:parts[1].toCharArray())value+=" "+DIGITS[digit-'0'];}
        return Character.toUpperCase(value.charAt(0))+value.substring(1)+" đồng";
    }
    private static String threeDigits(int value,boolean full) {
        int hundreds=value/100,tens=value/10%10,units=value%10;var result=new ArrayList<String>();
        if(hundreds>0||full){result.add(DIGITS[hundreds]+" trăm");if(tens==0&&units>0)result.add("lẻ");}
        if(tens>1)result.add(DIGITS[tens]+" mươi");else if(tens==1)result.add("mười");
        if(units>0)result.add(units==1&&tens>1?"mốt":units==5&&tens>0?"lăm":DIGITS[units]);
        return String.join(" ",result);
    }
}

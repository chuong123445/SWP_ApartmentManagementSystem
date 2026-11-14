package com.ancu.proptech.service.apartment;

import com.ancu.proptech.dto.apartment.AddressOption;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Name aliases only, grounded in the currently eligible public address catalog. */
final class PublicCityNames {
    private PublicCityNames() {}
    static String key(String value){
        if(value==null)return "";
        return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}+","")
            .toLowerCase(Locale.ROOT).replace('đ','d').replaceAll("[^\\p{L}\\p{N}]+"," ").strip()
            .replaceFirst("^(?:thanh pho|tp|tinh)\\s+","");
    }
    static boolean same(String first,String second){return key(first).equals(key(second));}
    static String canonical(String name,List<AddressOption> options){
        return options.stream().map(AddressOption::city).distinct().filter(city->same(city,name))
            .min(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder())).orElse(null);
    }
    static String request(String text,List<AddressOption> options){
        String result=text;
        for(String city:options.stream().map(AddressOption::city).distinct().toList()){
            String core=city.replaceFirst("(?iu)^(?:thành\\s+phố|tp\\.?|tỉnh)\\s+","");
            String pattern="(?iu)(?<!\\p{L})(?:thành\\s+phố|tp\\.?|tỉnh)\\s+"+Pattern.quote(core)+"(?!\\p{L})";
            result=result.replaceAll(pattern,java.util.regex.Matcher.quoteReplacement(canonical(city,options)));
        }
        return result;
    }
}

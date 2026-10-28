package com.ancu.proptech.service.property;
import com.ancu.proptech.exception.common.ApiException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.*;

/** PDF tải dưới dạng attachment; kiểm tra cấu trúc không phải quét virus hay xác thực pháp lý. */
@Component
public class EvidenceContentValidator {
    public void validatePdf(byte[] input){
        try(var pdf=Loader.loadPDF(input)){
            if(pdf.isEncrypted()||pdf.getNumberOfPages()<1||pdf.getNumberOfPages()>100)throw invalid();
            check(pdf.getDocument().getTrailer(),Collections.newSetFromMap(new IdentityHashMap<>()),0);
        }catch(IOException|IllegalArgumentException e){throw invalid();}
    }
    private void check(COSBase node,Set<COSBase> seen,int depth){
        if(node==null||!seen.add(node))return;
        if(depth>100||seen.size()>100_000)throw invalid();
        if(node instanceof COSObject object){check(object.getObject(),seen,depth+1);return;}
        if(node instanceof COSArray array){for(int i=0;i<array.size();i++)check(array.get(i),seen,depth+1);}
        if(node instanceof COSDictionary dictionary)for(var entry:dictionary.entrySet()){
            if(Set.of("JS","JavaScript","AA","OpenAction","EmbeddedFiles","RichMedia","XFA").contains(entry.getKey().getName()))throw invalid();
            if(entry.getKey().getName().equals("S")&&entry.getValue() instanceof COSName name&&Set.of("Launch","SubmitForm","ImportData","GoToR").contains(name.getName()))throw invalid();
            check(entry.getValue(),seen,depth+1);
        }
    }
    private static ApiException invalid(){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_FILE","PDF phải hợp lệ, không mã hóa hoặc nội dung chủ động, từ 1 đến 100 trang.");}
}

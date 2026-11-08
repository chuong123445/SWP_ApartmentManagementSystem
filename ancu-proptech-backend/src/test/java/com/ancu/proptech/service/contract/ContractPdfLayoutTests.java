package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.contract.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ContractPdfLayoutTests {
    private ContractDraftResponse draft(boolean longContent) {
        var party=new ContractSnapshot.Party("1","Người kiểm thử","private@example.invalid","0900000000","Địa chỉ liên hệ",LocalDate.of(1990,1,1),false,
            "999000000001",LocalDate.of(2021,4,6),"Cục Cảnh sát quản lý hành chính về trật tự xã hội","Địa chỉ thường trú kiểm thử","VERIFIED",false);
        var asset=new ContractSnapshot.Asset("1","1","CATALOG PROPERTY","CATALOG TITLE","208","33 Đường kiểm thử, Đà Nẵng",null,null,null,"45",2,3,2,List.of("CATALOG AMENITY"),"APPROVED",null,"OWNERSHIP","CERTIFICATE-PRIVATE",null,"CERTIFICATE ISSUER","RIGHT DESCRIPTION",false);
        var clauses=new ArrayList<ContractClause>();
        for(int i=1;i<=7;i++)clauses.add(new ContractClause("Thỏa thuận "+i,longContent?"Hai bên thống nhất nội dung đã rà soát. ".repeat(35)+"KẾT THÚC ĐIỀU "+i:"Hai bên thống nhất giữ gìn tài sản và thực hiện đúng các khoản thanh toán đã thỏa thuận."));
        return new ContractDraftResponse(1L,1L,"HD-1","DRAFT",0,LocalDate.of(2026,11,1),LocalDate.of(2027,11,1),"2600000","3800","50000","2600000",3,"Chuyển khoản","Để ở",clauses,
            new ContractSnapshot(party,party,asset,new ContractSnapshot.ReceivingAccount("BANK-OMIT","ACCOUNT-OMIT","HOLDER-OMIT")),Instant.parse("2026-11-03T00:00:00Z"),"ROOM",
            new ContractDraftResponse.Signing("1","2","a".repeat(64),"UNSIGNED",null,null,null,null),null,"PER_PERSON",2,"100000","30000","NONE");
    }
    @Test void compactFormKeepsAgreedFieldsWithoutCatalogOrContactMetadata()throws Exception {
        byte[] bytes=new ContractPdfService().render(draft(false));
        try(var pdf=Loader.loadPDF(bytes)) {
            String text=new PDFTextStripper().getText(pdf);
            assertTrue(pdf.getNumberOfPages()<=2,"A normal seven-clause contract should fit at most two pages");
            for(String field:List.of("HỢP ĐỒNG THUÊ PHÒNG TRỌ","Sinh ngày","Thường trú tại","Số CCCD","Cấp ngày","Tại:","SĐT","208","2.600.000","Hai triệu sáu trăm nghìn đồng","3.800","50.000","đ/người/tháng","Internet","vệ sinh","Thỏa thuận 7","Ký, ghi rõ họ tên"))assertTrue(text.contains(field),field);
            for(String field:List.of("BANK-OMIT","ACCOUNT-OMIT","HOLDER-OMIT","Ngân hàng:","Chủ tài khoản:","Số tài khoản:","CATALOG","private@example","CERTIFICATE","RIGHT DESCRIPTION","Phòng ngủ","phòng tắm","Trang bị:","I. TÀI SẢN","II. GIÁ THUÊ"))assertFalse(text.contains(field),field);
            int previous=-1;
            for(String section:List.of("Hôm nay, ngày 3 tháng 11 năm 2026.","Tại địa chỉ:","Chúng tôi gồm:","1. BÊN CHO THUÊ PHÒNG (Bên A)","2. BÊN THUÊ PHÒNG TRỌ (Bên B)","Sau khi bàn bạc hai bên cùng thống nhất như sau:","Bên A đồng ý cho Bên B thuê 1 phòng số 208","Giá thuê là:","Thanh toán vào ngày 3 hàng tháng.","Tiền điện:","Tiền nước:","ĐIỀU KHOẢN HỢP ĐỒNG","Thỏa thuận 1","Thỏa thuận 7","XÁC NHẬN CỦA HAI BÊN")){
                int position=text.indexOf(section);assertTrue(position>previous,"Order of "+section);previous=position;
            }
            assertEquals(1,text.split("Nơi công tác:",-1).length-1,"Only the exact contract customer has a tenant form");
            assertEquals(1,text.split("- Ông/Bà:",-1).length-1,"No extra blank tenant slot");
            assertEquals(2,text.split("Sinh ngày:",-1).length-1,"One owner and one customer");
            assertEquals(2,text.split("Số CCCD:",-1).length-1,"No third identity section");
            for(var page:pdf.getPages())for(var name:page.getResources().getFontNames())assertTrue(page.getResources().getFont(name).getName().contains("NotoSerif"));
            java.nio.file.Files.write(java.nio.file.Path.of("target/compact-contract.pdf"),bytes);
            var renderer=new org.apache.pdfbox.rendering.PDFRenderer(pdf);
            for(int i=0;i<pdf.getNumberOfPages();i++)javax.imageio.ImageIO.write(renderer.renderImageWithDPI(i,100),"png",new java.io.File("target/compact-contract-"+(i+1)+".png"));
        }
    }
    @Test void longAgreementsPaginateWithoutDroppingClausesOrCreatingEmptyPages()throws Exception {
        try(var pdf=Loader.loadPDF(new ContractPdfService().render(draft(true)))) {
            var stripper=new PDFTextStripper();String text=stripper.getText(pdf).replaceAll("\\s+"," ");assertTrue(pdf.getNumberOfPages()>2);
            for(int i=1;i<=7;i++)assertTrue(text.contains("KẾT THÚC ĐIỀU "+i),"Complete end marker for clause "+i);
            for(int i=1;i<=pdf.getNumberOfPages();i++){stripper.setStartPage(i);stripper.setEndPage(i);assertTrue(stripper.getText(pdf).length()>180,"No nearly empty page "+i);}
        }
    }
}

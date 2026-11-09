package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.*;
import com.ancu.proptech.dto.contract.ContractExitDtos.*;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class HandoverPdfLayoutTests {
 @Test void longInventoryAndUnbrokenNotesPaginateWithoutLosingContent()throws Exception{
  var party=new ContractSnapshot.Party("1","Nguyễn Văn Chương","owner@example.invalid","0900000000","TP. Hồ Chí Minh",null,true,"999000000001",LocalDate.of(2021,4,6),"Cục Cảnh sát","TP. Hồ Chí Minh","VERIFIED",false);
  var asset=new ContractSnapshot.Asset("1","1","An Cư","Căn hộ A101","A101","28 Đường số 2",null,null,null,"45",1,1,1,List.of(),"APPROVED",null,null,null,null,null,null,false);
  var record=new Document("BBBG-HD-1",LocalDate.of(2026,1,1),LocalDate.of(2026,11,8),new ContractSnapshot(party,party,asset,null),LocalDate.of(2026,11,9),new HandDetails("28 Đường số 2","Máy lạnh, tủ, giường và thiết bị được kiểm tra. ".repeat(45)+"HẾT DANH MỤC",2,"GHI_CHÚ_DÀI".repeat(100)+"HẾT GHI CHÚ"),"Nguyên trạng",true,List.of("1"),null,null,null,null,null);
  try(var pdf=Loader.loadPDF(new HandoverPdfService().render(record,new Signing("a".repeat(64),"UNSIGNED",null,null,null,null)))){
   var text=new PDFTextStripper().getText(pdf).replaceAll("\\s+"," ");assertTrue(pdf.getNumberOfPages()>1);assertTrue(text.contains("HẾT DANH MỤC"));assertTrue(text.contains("HẾT GHI CHÚ"));assertTrue(text.contains("CCCD"));assertTrue(text.contains("Ký, ghi rõ họ tên"));assertFalse(text.contains("Chỉ số công tơ"));
  }
 }
}

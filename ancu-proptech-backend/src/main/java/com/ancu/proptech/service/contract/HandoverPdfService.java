package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.contract.ContractDraftResponse;
import com.ancu.proptech.dto.contract.ContractExitDtos.*;
import com.ancu.proptech.dto.contract.ContractSnapshot;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class HandoverPdfService {
 public byte[] render(Document record,Signing signing){
  try(var pdf=new PDDocument();var regular=new ClassPathResource("fonts/NotoSerif-Regular.ttf").getInputStream();var bold=new ClassPathResource("fonts/NotoSerif-Bold.ttf").getInputStream()){
   var w=new ContractPdfService.Layout(pdf,PDType0Font.load(pdf,regular,true),PDType0Font.load(pdf,bold,true));
   w.center("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",12,true);
   w.center("Độc lập - Tự do - Hạnh phúc",11,true);w.gap(14);
   w.center("BIÊN BẢN BÀN GIAO LẠI NHÀ THUÊ",16,true);
   w.center("Số: "+record.number(),11,false);w.gap(10);
   w.text("Căn cứ hợp đồng số "+record.number().replace("BBBG-","")+", thuê từ ngày "+date(record.contractStartDate())+" đến ngày "+date(record.contractEndDate())+" giữa hai bên.");
   w.text("Hôm nay, ngày "+date(record.returnDate())+", tại "+record.details().location()+", chúng tôi gồm:");
   party(w,"BÊN NHẬN BÀN GIAO - BÊN CHO THUÊ (BÊN A)",record.snapshot().owner());
   party(w,"BÊN BÀN GIAO - BÊN THUÊ (BÊN B)",record.snapshot().customer());
   var a=record.snapshot().asset();
   w.heading("NỘI DUNG BÀN GIAO");
   w.text("Căn/phòng: "+show(a.roomNumber())+" - "+show(a.propertyName()));
   w.text("Địa chỉ: "+show(a.address()));
   w.text("Diện tích: "+show(a.areaM2())+" m²; tầng: "+show(a.floor())+"; số phòng ngủ: "+show(a.bedrooms())+"; số phòng tắm: "+show(a.bathrooms())+".");
   w.heading("1. Danh mục tài sản, thiết bị bàn giao");w.text(record.details().inventory());
   w.heading("2. Tình trạng nhà và tài sản");w.text(record.conditionNotes());
   w.text("Số chìa khóa bàn giao: "+record.details().keyCount()+". Hai bên kiểm tra chìa khóa và các tài sản nêu trên.");
   if(record.electricityReading()!=null){w.heading("3. Chỉ số công tơ được ghi nhận kèm theo");
    w.text("Điện: "+record.electricityStartReading()+" - "+record.electricityReading()+" kWh; nước: "+record.waterStartReading()+" - "+record.waterReading()+" m³.");}
   if(record.details().notes()!=null&&!record.details().notes().isBlank()){w.heading("Ghi chú và thỏa thuận khác");w.text(record.details().notes());}
   if(!record.evidenceIds().isEmpty())w.text("Chứng cứ đính kèm trong hồ sơ: "+String.join(", ",record.evidenceIds())+".");
   w.room(250);
   w.text("Bên B bàn giao lại nhà và tài sản cho Bên A theo hiện trạng ghi nhận. Hai bên đã đọc, kiểm tra và thống nhất nội dung biên bản.");
   w.text("Biên bản hoàn tất khi cả hai bên ký cùng bản nội dung. Công nợ và các thỏa thuận tiền cọc được xử lý riêng.");
   w.signatures(show(record.snapshot().owner().fullName()),show(record.snapshot().customer().fullName()),new ContractDraftResponse.Signing(record.snapshot().owner().id(),record.snapshot().customer().id(),signing.contentHash(),signing.state(),signing.ownerSignedAt(),signing.customerSignedAt(),signing.ownerSignature(),signing.customerSignature()));
   w.finish(record.number(),signing.state(),signing.contentHash());
   pdf.getDocumentInformation().setTitle(record.number()+" - Biên bản bàn giao lại nhà thuê");
   var bytes=new ByteArrayOutputStream();pdf.save(bytes);return bytes.toByteArray();
  }catch(IOException ex){throw new IllegalStateException("Không thể tạo PDF bàn giao.",ex);}
 }
 private void party(ContractPdfService.Layout w,String title,ContractSnapshot.Party p)throws IOException{
  w.heading(title);w.text("Ông/Bà: "+show(p.fullName()));
  w.text("CCCD: "+show(p.documentNumber())+"; cấp ngày: "+date(p.documentIssueDate())+"; nơi cấp: "+show(p.documentIssuePlace()));
  w.text("Địa chỉ: "+show(p.permanentAddress()==null?p.address():p.permanentAddress()));
  w.text("Điện thoại: "+show(p.phone())+"; email: "+show(p.email()));
 }
 private static String show(Object value){return value==null||value.toString().isBlank()?"Chưa cung cấp":value.toString();}
 private static String date(LocalDate value){return value==null?"Chưa cung cấp":value.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));}
}

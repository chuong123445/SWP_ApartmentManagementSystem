package com.ancu.proptech.service.contract;

import com.ancu.proptech.dto.contract.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.*;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Generates a real, paginated PDF from the private, frozen server snapshot. */
@Service
public class ContractPdfService {
    public byte[] render(ContractDraftResponse draft) {
        try(var document=new PDDocument();var regular=new ClassPathResource("fonts/NotoSans-Regular.ttf").getInputStream();
                var bold=new ClassPathResource("fonts/NotoSans-Bold.ttf").getInputStream()) {
            var font=PDType0Font.load(document,regular,true);
            var strong=PDType0Font.load(document,bold,true);
            var writer=new Layout(document,font,strong);
            writer.center("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",12,true);
            writer.center("Độc lập - Tự do - Hạnh phúc",11,false);
            writer.gap(18);
            writer.center("HỢP ĐỒNG THUÊ "+template(draft.templateType()).toUpperCase(Locale.ROOT),17,true);
            writer.center("Số: "+draft.contractNumber(),10,false);
            String state="SIGNED".equals(draft.signing().state())?"HAI BÊN ĐÃ KÝ XÁC NHẬN":
                    "UNSIGNED".equals(draft.signing().state())?"BẢN NHÁP - CHƯA KÝ":"ĐANG CHỜ CHỮ KÝ CÒN LẠI";
            writer.center(state,10,true);writer.gap(12);
            writer.text("Hai bên dưới đây cùng rà soát và thỏa thuận nội dung hợp đồng thuê tài sản như sau:");
            party(writer,"BÊN CHO THUÊ (BÊN A)",draft.snapshot().owner());
            party(writer,"BÊN THUÊ (BÊN B)",draft.snapshot().customer());
            var asset=draft.snapshot().asset();
            writer.heading("I. TÀI SẢN CHO THUÊ");
            writer.field("Tài sản",asset.propertyName()+" / "+asset.title());
            writer.field("Phòng / căn",asset.roomNumber());writer.field("Địa chỉ",asset.address());
            writer.field("Diện tích",asset.areaM2()+" m²");writer.field("Tầng",asset.floor());
            writer.field("Phòng ngủ / phòng tắm",show(asset.bedrooms())+" / "+show(asset.bathrooms()));
            writer.field("Trang bị",asset.amenities()==null||asset.amenities().isEmpty()?null:String.join(", ",asset.amenities()));
            writer.field("Mục đích thuê",draft.usagePurpose());
            writer.field("Giấy chứng nhận",asset.certificateNumber());writer.field("Ngày cấp",date(asset.certificateIssueDate()));
            writer.field("Nơi cấp",asset.certificateIssuePlace());writer.field("Căn cứ quyền cho thuê",asset.exploitationRightDescription());
            if(Boolean.TRUE.equals(asset.localFixture())) writer.text("Lưu ý: hồ sơ tài sản này được đánh dấu dữ liệu minh họa trong hệ thống.");
            writer.heading("II. GIÁ THUÊ, ĐẶT CỌC VÀ THANH TOÁN");
            writer.field("Thời hạn",date(draft.startDate())+" đến "+date(draft.endDate()));
            writer.field("Giá thuê mỗi tháng",money(draft.monthlyRent())+" đồng");
            writer.field("Tiền đặt cọc",money(draft.deposit())+" đồng");
            writer.field("Thanh toán", "Ngày "+draft.paymentDay()+" hàng tháng; "+draft.paymentMethod());
            writer.field("Điện",money(draft.electricityUnitPrice())+" đồng/kWh, theo chỉ số sử dụng");
            writer.field("Nước",money(draft.waterUnitPrice())+" đồng/m³, theo chỉ số sử dụng");
            var bank=draft.snapshot().receivingAccount();
            if(bank!=null){writer.field("Ngân hàng",bank.bank());writer.field("Chủ tài khoản",bank.accountHolderName());writer.field("Số tài khoản",bank.accountNumber());}
            writer.heading("III. ĐIỀU KHOẢN THỎA THUẬN");
            int index=0;
            for(var clause:draft.clauses()){writer.heading("Điều "+(++index)+". "+clause.title());writer.text(clause.body());}
            writer.heading("IV. XÁC NHẬN CỦA HAI BÊN");
            writer.text("Hai bên đã đọc, hiểu và đồng ý với nội dung trên. Chữ ký xác nhận gắn với đúng bản nội dung có mã SHA-256 ở cuối mỗi trang. Bản chưa đủ hai chữ ký vẫn ở trạng thái chờ ký.");
            writer.signatures(draft);
            writer.gap(8);
            writer.small("Chữ ký tay được ghi nhận qua tài khoản đăng nhập; không phải chữ ký số sử dụng chứng thư số.");
            writer.finish(draft);
            document.getDocumentInformation().setTitle(draft.contractNumber()+" - Hợp đồng thuê "+template(draft.templateType()));
            document.getDocumentInformation().setCreator("An Cư PropTech");
            var bytes=new ByteArrayOutputStream();document.save(bytes);return bytes.toByteArray();
        }catch(IOException ex){throw new IllegalStateException("Không thể tạo PDF hợp đồng.",ex);}
    }
    public static String template(String value){return switch(value==null?"APARTMENT":value){case "HOUSE"->"nhà nguyên căn";case "ROOM"->"phòng trọ";case "BUSINESS"->"mặt bằng kinh doanh";case "SHARED"->"phòng ở ghép";default->"căn hộ";};}
    private static String show(Object value){return value==null||value.toString().isBlank()?"Chưa cung cấp":value.toString();}
    private static String date(LocalDate value){return value==null?null:value.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));}
    private static String money(String value){return new java.text.DecimalFormat("#,##0.##",new java.text.DecimalFormatSymbols(Locale.forLanguageTag("vi-VN"))).format(new BigDecimal(value));}
    private static void party(Layout w,String title,ContractSnapshot.Party p)throws IOException{
        w.heading(title);w.field("Họ và tên",p.fullName());w.field("Ngày sinh",date(p.dateOfBirth()));w.field("CCCD / CMND",p.documentNumber());
        w.field("Ngày cấp",date(p.documentIssueDate()));w.field("Nơi cấp",p.documentIssuePlace());w.field("Điện thoại",p.phone());w.field("Email",p.email());
        w.field("Địa chỉ",p.address());w.field("Thường trú",p.permanentAddress());
        if(Boolean.TRUE.equals(p.localFixture())) w.small("Thông tin bên này được đánh dấu hồ sơ minh họa.");
    }
    private static class Layout {
        final PDDocument document;final PDType0Font font,bold;PDPage page;PDPageContentStream out;float y;
        final float left=48,width=PDRectangle.A4.getWidth()-96;
        Layout(PDDocument d,PDType0Font f,PDType0Font b)throws IOException{document=d;font=f;bold=b;newPage();}
        void newPage()throws IOException{if(out!=null)out.close();page=new PDPage(PDRectangle.A4);document.addPage(page);out=new PDPageContentStream(document,page);y=PDRectangle.A4.getHeight()-48;}
        void room(float height)throws IOException{if(y-height<70)newPage();}
        void gap(float space){y-=space;}
        String clean(String value,PDType0Font f)throws IOException{
            String text=Normalizer.normalize(value==null?"":value,Normalizer.Form.NFC).replace('\t',' ').replaceAll("[\\p{Cc}&&[^\\n]]","");
            var safe=new StringBuilder();
            for(int cp:text.codePoints().toArray()){if(cp=='\n'){safe.append('\n');continue;}String ch=new String(Character.toChars(cp));try{f.getStringWidth(ch);safe.append(ch);}catch(IllegalArgumentException ex){safe.append('?');}}
            return safe.toString();
        }
        void line(String text,float size,boolean strong,float x)throws IOException{var f=strong?bold:font;out.beginText();out.setFont(f,size);out.newLineAtOffset(x,y);out.showText(clean(text,f));out.endText();}
        void center(String text,float size,boolean strong)throws IOException{room(size+10);var f=strong?bold:font;String s=clean(text,f);line(s,size,strong,(PDRectangle.A4.getWidth()-f.getStringWidth(s)/1000*size)/2);y-=size+9;}
        void paragraph(String value,float size,boolean strong)throws IOException{
            var f=strong?bold:font;String text=clean(value,f);
            for(String paragraph:text.split("\n",-1)){
                String current="";
                for(String word:paragraph.split("\\s+")){
                    if(word.isEmpty())continue;
                    String candidate=current.isEmpty()?word:current+" "+word;
                    if(f.getStringWidth(candidate)/1000*size<=width){current=candidate;continue;}
                    if(!current.isEmpty()){room(size+6);line(current,size,strong,left);y-=size+6;current="";}
                    for(int cp:word.codePoints().toArray()){
                        String next=current+new String(Character.toChars(cp));
                        if(f.getStringWidth(next)/1000*size>width && !current.isEmpty()){room(size+6);line(current,size,strong,left);y-=size+6;current="";}
                        current+=new String(Character.toChars(cp));
                    }
                }
                room(size+6);line(current,size,strong,left);y-=size+6;
            }gap(4);
        }
        void text(String value)throws IOException{paragraph(value,10.5f,false);}
        void small(String value)throws IOException{paragraph(value,8.5f,false);}
        void heading(String value)throws IOException{room(50);gap(10);paragraph(value,11.5f,true);}
        void field(String label,Object value)throws IOException{text(label+": "+show(value));}
        void signatures(ContractDraftResponse d)throws IOException{
            room(190);gap(10);float top=y;float half=(width-20)/2;
            for(int i=0;i<2;i++){
                float x=left+i*(half+20);y=top;
                line(i==0?"BÊN CHO THUÊ (BÊN A)":"BÊN THUÊ (BÊN B)",10,true,x);y-=19;
                line("Ký, ghi rõ họ tên",9,false,x);
                out.setStrokingColor(175/255f,185/255f,180/255f);out.addRect(x,top-119,half,75);out.stroke();
                String signature=i==0?d.signing().ownerSignature():d.signing().customerSignature();
                if(signature!=null){byte[] image=Base64.getDecoder().decode(signature.substring(22));var object=PDImageXObject.createFromByteArray(document,image,"signature");
                    float scale=Math.min((half-16)/object.getWidth(),63f/object.getHeight());float w=object.getWidth()*scale,h=object.getHeight()*scale;
                    out.drawImage(object,x+(half-w)/2,top-113+(63-h)/2,w,h);}
                y=top-139;
                String name=i==0?d.snapshot().owner().fullName():d.snapshot().customer().fullName();
                float nameSize=10;while(nameSize>7 && bold.getStringWidth(clean(name,bold))/1000*nameSize>half)nameSize-=.5f;
                line(name,nameSize,true,x);y-=17;
                Instant at=i==0?d.signing().ownerSignedAt():d.signing().customerSignedAt();
                line(at==null?"Chưa ký":at.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),8,false,x);
            }y=top-175;
        }
        void finish(ContractDraftResponse d)throws IOException{
            out.close();out=null;int count=document.getNumberOfPages();
            for(int i=0;i<count;i++)try(var footer=new PDPageContentStream(document,document.getPage(i),PDPageContentStream.AppendMode.APPEND,true,true)){
                footer.setNonStrokingColor(90/255f,100/255f,95/255f);footer.beginText();footer.setFont(font,8);footer.newLineAtOffset(left,44);
                footer.showText(d.contractNumber()+" | Trang "+(i+1)+" / "+count);footer.endText();
                footer.beginText();footer.setFont(font,6.5f);footer.newLineAtOffset(left,30);footer.showText("SHA-256: "+d.signing().contentHash());footer.endText();
            }
        }
    }
}

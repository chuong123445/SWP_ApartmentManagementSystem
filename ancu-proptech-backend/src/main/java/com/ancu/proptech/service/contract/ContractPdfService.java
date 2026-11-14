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
        try(var document=new PDDocument();var regular=new ClassPathResource("fonts/NotoSerif-Regular.ttf").getInputStream();
                var bold=new ClassPathResource("fonts/NotoSerif-Bold.ttf").getInputStream()) {
            var font=PDType0Font.load(document,regular,true);
            var strong=PDType0Font.load(document,bold,true);
            var writer=new Layout(document,font,strong);
            writer.center("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",13,true);
            writer.center("Độc lập - Tự do - Hạnh phúc",12,true);
            writer.gap(22);
            writer.center("HỢP ĐỒNG THUÊ "+template(draft.templateType()).toUpperCase(Locale.ROOT),18,true);
            writer.gap(25);
            var created=draft.createdAt().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
            writer.text("Hôm nay, ngày "+created.getDayOfMonth()+" tháng "+created.getMonthValue()+" năm "+created.getYear()+".");
            writer.text("Tại địa chỉ: "+show(draft.snapshot().asset().address()));
            writer.text("Chúng tôi gồm:");
            boolean room="ROOM".equals(draft.templateType())||"SHARED".equals(draft.templateType());
            party(writer,"1. BÊN CHO THUÊ"+(room?" PHÒNG":"")+" (Bên A)",draft.snapshot().owner(),false);
            party(writer,"2. BÊN THUÊ"+(room?" PHÒNG TRỌ":"")+" (Bên B)",draft.snapshot().customer(),true);
            var asset=draft.snapshot().asset();
            writer.text("Sau khi bàn bạc hai bên cùng thống nhất như sau:");
            writer.text("Bên A đồng ý cho Bên B thuê 1 "+(room?"phòng":template(draft.templateType()))+" số "+show(asset.roomNumber())+" tại địa chỉ "+show(asset.address())+".");
            writer.text("Giá thuê là: "+money(draft.monthlyRent())+" đ/tháng (Bằng chữ: "+VietnameseAmountWords.read(draft.monthlyRent())+").");
            writer.text(draft.separateBillingAgreed()?"Tiền thuê thanh toán mỗi "+draft.rentCycleMonths()+" tháng, hạn ngày "+draft.paymentDay()+" của tháng đầu kỳ.":"Thanh toán vào ngày "+draft.paymentDay()+" hàng tháng.");
            if(draft.separateBillingAgreed())writer.text("Tiền điện, nước và dịch vụ lập hóa đơn riêng hàng tháng. Tiền thuê chỉ tự tính tháng tròn; phần ngày lẻ do hai bên đối chiếu và xử lý riêng.");
            writer.text("Tiền điện: "+money(draft.electricityUnitPrice())+" đ/kWh, tính theo chỉ số công tơ.");
            writer.text("Tiền nước: "+money(draft.waterUnitPrice())+("PER_PERSON".equals(draft.waterBillingMode())?" đ/người/tháng.":" đ/m³, tính theo chỉ số công tơ."));
            if(new BigDecimal(draft.internetFee()).signum()>0)writer.text("Tiền Internet: "+money(draft.internetFee())+" đ/phòng/tháng.");
            if(new BigDecimal(draft.garbageFee()).signum()>0)writer.text("Tiền vệ sinh và rác: "+money(draft.garbageFee())+" đ/phòng/tháng.");
            writer.room(180);
            writer.heading("ĐIỀU KHOẢN HỢP ĐỒNG");
            writer.text("Thời hạn thuê: từ "+date(draft.startDate())+" đến "+date(draft.endDate())+".");
            writer.text("Tiền đặt cọc: "+money(draft.deposit())+" đồng. Phương thức thanh toán: "+draft.paymentMethod()+".");
            writer.text("Mục đích thuê: "+draft.usagePurpose()+".");
            if("PER_PERSON".equals(draft.waterBillingMode()))writer.text("Số người tính tiền nước: "+draft.occupantCount()+".");
            int index=0;
            for(var clause:draft.clauses()){writer.heading("Điều "+(++index)+". "+clause.title());writer.text(clause.body());}
            writer.heading("XÁC NHẬN CỦA HAI BÊN");
            writer.text("Hai bên đã đọc, hiểu và đồng ý với nội dung trên. Chữ ký xác nhận gắn với đúng bản nội dung có mã SHA-256 ở cuối mỗi trang. Bản chưa đủ hai chữ ký vẫn ở trạng thái chờ ký.");
            writer.signatures(draft);
            writer.gap(8);
            if(Boolean.TRUE.equals(asset.localFixture())||Boolean.TRUE.equals(draft.snapshot().owner().localFixture())||Boolean.TRUE.equals(draft.snapshot().customer().localFixture()))
                writer.small("Hợp đồng có thông tin hồ sơ minh họa trong hệ thống.");
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
    private static void party(Layout w,String title,ContractSnapshot.Party p,boolean customer)throws IOException{
        w.heading(title);w.pair(customer?"- Ông/Bà":"Ông/Bà",p.fullName(),"Sinh ngày",date(p.dateOfBirth()));
        w.formField("Thường trú tại",p.permanentAddress());
        w.pair("Số CCCD",p.documentNumber(),"Cấp ngày",date(p.documentIssueDate()));
        w.formField("Tại",p.documentIssuePlace());w.formField("SĐT",p.phone());
        if(customer)w.formField("Nơi công tác",null);
    }
    static class Layout {
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
        void center(String text,float size,boolean strong)throws IOException{room(size+6);var f=strong?bold:font;String s=clean(text,f);line(s,size,strong,(PDRectangle.A4.getWidth()-f.getStringWidth(s)/1000*size)/2);y-=size+6;}
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
            }gap(1);
        }
        void text(String value)throws IOException{paragraph(value,11,false);}
        void small(String value)throws IOException{paragraph(value,8.5f,false);}
        void heading(String value)throws IOException{room(38);gap(4);paragraph(value,11.5f,true);}
        String dotted(String label,Object value,float available)throws IOException{
            String text=label+": "+(value==null?"":value.toString());
            if(value==null||value.toString().isBlank())while(font.getStringWidth(clean(text+".",font))/1000*11<available-3)text+=".";
            return text;
        }
        void formField(String label,Object value)throws IOException{text(dotted(label,value,width));}
        void pair(String first,Object a,String second,Object b)throws IOException{
            float split=width*.62f;
            String lhs=clean(dotted(first,a,split-12),font),rhs=clean(dotted(second,b,width-split),font);
            if(font.getStringWidth(lhs)/1000*11>split-12 || font.getStringWidth(rhs)/1000*11>width-split){formField(first,a);formField(second,b);return;}
            room(18);line(lhs,11,false,left);line(rhs,11,false,left+split);y-=18;
        }
        void signatures(ContractDraftResponse d)throws IOException{
            signatures(d.snapshot().owner().fullName(),d.snapshot().customer().fullName(),d.signing());
        }
        void signatures(String ownerName,String customerName,ContractDraftResponse.Signing signing)throws IOException{
            room(185);gap(6);float top=y;float half=(width-20)/2;
            for(int i=0;i<2;i++){
                float x=left+i*(half+20);y=top;
                line(i==0?"BÊN CHO THUÊ (BÊN A)":"BÊN THUÊ (BÊN B)",10,true,x);y-=19;
                line("Ký, ghi rõ họ tên",9,false,x);
                out.setStrokingColor(175/255f,185/255f,180/255f);out.addRect(x,top-119,half,75);out.stroke();
                String signature=i==0?signing.ownerSignature():signing.customerSignature();
                if(signature!=null){byte[] image=Base64.getDecoder().decode(signature.substring(22));var object=PDImageXObject.createFromByteArray(document,image,"signature");
                    float scale=Math.min((half-16)/object.getWidth(),63f/object.getHeight());float w=object.getWidth()*scale,h=object.getHeight()*scale;
                    out.drawImage(object,x+(half-w)/2,top-113+(63-h)/2,w,h);}
                y=top-139;
                String name=i==0?ownerName:customerName;
                float nameSize=10;while(nameSize>7 && bold.getStringWidth(clean(name,bold))/1000*nameSize>half)nameSize-=.5f;
                line(name,nameSize,true,x);y-=17;
                Instant at=i==0?signing.ownerSignedAt():signing.customerSignedAt();
                line(at==null?"Chưa ký":at.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),8,false,x);
            }y=top-170;
        }
        void finish(ContractDraftResponse d)throws IOException{
            finish(d.contractNumber(),d.signing().state(),d.signing().contentHash());
        }
        void finish(String number,String signingState,String hash)throws IOException{
            out.close();out=null;int count=document.getNumberOfPages();
            String state="SIGNED".equals(signingState)?"HAI BÊN ĐÃ KÝ XÁC NHẬN":
                "UNSIGNED".equals(signingState)?"BẢN NHÁP - CHƯA KÝ":"ĐANG CHỜ CHỮ KÝ CÒN LẠI";
            for(int i=0;i<count;i++)try(var footer=new PDPageContentStream(document,document.getPage(i),PDPageContentStream.AppendMode.APPEND,true,true)){
                footer.setNonStrokingColor(90/255f,100/255f,95/255f);footer.beginText();footer.setFont(font,8);footer.newLineAtOffset(left,44);
                footer.showText(number+" | "+state+" | Trang "+(i+1)+" / "+count);footer.endText();
                footer.beginText();footer.setFont(font,6.5f);footer.newLineAtOffset(left,30);footer.showText("SHA-256: "+hash);footer.endText();
            }
        }
    }
}

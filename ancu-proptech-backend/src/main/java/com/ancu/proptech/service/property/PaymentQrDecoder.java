package com.ancu.proptech.service.property;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.multi.qrcode.QRCodeMultiReader;
import java.util.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
@Component
public class PaymentQrDecoder {
 public record Decoded(String bankBin,String bankName,String accountNumber,String accountHolderName,String contentType) {}
 public Decoded decode(byte[] bytes) {
  if(bytes.length==0||bytes.length>1000000)throw invalid("Ảnh QR phải từ 1 byte đến 1 MB.");
  try(var stream=javax.imageio.ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
   var readers=javax.imageio.ImageIO.getImageReaders(stream);if(!readers.hasNext())throw invalid("Chỉ nhận ảnh PNG/JPEG hợp lệ.");
   var reader=readers.next();try {
    reader.setInput(stream);String format=reader.getFormatName().toLowerCase(Locale.ROOT);
    if(!Set.of("png","jpeg").contains(format))throw invalid("Chỉ nhận PNG/JPEG.");
    int w=reader.getWidth(0),h=reader.getHeight(0);if(w<1||h<1||w>4096||h>4096||(long)w*h>12000000)throw invalid("Ảnh QR vượt giới hạn kích thước.");
    var bitmap=new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(reader.read(0))));
    var codes=new QRCodeMultiReader().decodeMultiple(bitmap,Map.of(DecodeHintType.TRY_HARDER,true));
    if(codes.length!=1)throw invalid("Ảnh cần chứa đúng một mã QR nhận tiền.");
    return parse(codes[0].getText(),format.equals("png")?"image/png":"image/jpeg");
   }finally{reader.dispose();}
  }catch(ApiException e){throw e;}catch(Exception e){throw invalid("Không đọc được QR. Hãy dùng ảnh rõ nét từ ứng dụng ngân hàng.");}
 }
 public Decoded parse(String raw,String mime) {
  if(raw==null||raw.length()>4096||!raw.matches("(?s).*6304[0-9a-fA-F]{4}$"))throw invalid("QR không đúng định dạng VietQR.");
  String expected=String.format("%04X",crc(raw.substring(0,raw.length()-4)));
  if(!expected.equalsIgnoreCase(raw.substring(raw.length()-4)))throw invalid("QR sai mã kiểm tra. Hãy tải lại ảnh gốc.");
  var top=tlv(raw);if(!"01".equals(top.get("00"))||!"704".equals(top.get("53"))||!"VN".equals(top.get("58")))throw invalid("Chỉ hỗ trợ VietQR chuyển khoản VND tại Việt Nam.");
  if(top.containsKey("54") && !top.get("54").matches("0+(\\.0+)?"))throw invalid("QR có số tiền cố định. Hãy tải QR cá nhân không gắn số tiền để dùng cho nhiều hóa đơn.");
  var network=tlv(top.get("38"));if(!"A000000727".equals(network.get("00"))||!"QRIBFTTA".equals(network.get("02")))throw invalid("Chỉ hỗ trợ VietQR chuyển đến tài khoản ngân hàng.");
  var bank=tlv(network.get("01"));String bin=bank.get("00"),account=bank.get("01");
  if(bin==null||!bin.matches("[0-9]{6}")||account==null||!account.matches("[A-Za-z0-9]{1,34}"))throw invalid("QR thiếu ngân hàng hoặc số tài khoản hợp lệ.");
  return new Decoded(bin,bankName(bin),account,top.getOrDefault("59",""),mime);
 }
 private static Map<String,String> tlv(String text) {
  if(text==null)throw invalid("QR thiếu dữ liệu ngân hàng.");var result=new LinkedHashMap<String,String>();
  for(int i=0;i<text.length();) {
   if(i+4>text.length()||!text.substring(i,i+4).matches("[0-9]{4}"))throw invalid("Cấu trúc QR không hợp lệ.");
   String tag=text.substring(i,i+2);int size=Integer.parseInt(text.substring(i+2,i+4));i+=4;
   if(i+size>text.length()||result.containsKey(tag))throw invalid("Cấu trúc QR không hợp lệ.");result.put(tag,text.substring(i,i+size));i+=size;
  }return result;
 }
 public static int crc(String text){int crc=0xffff;for(byte value:text.getBytes(StandardCharsets.UTF_8)){crc^=(value&255)<<8;for(int i=0;i<8;i++)crc=((crc&0x8000)!=0?(crc<<1)^0x1021:crc<<1)&0xffff;}return crc;}
 public static String bankName(String bin){return Map.of("970422","MBBank","970436","Vietcombank","970415","VietinBank","970418","BIDV","970407","Techcombank","970416","ACB","970432","VPBank").getOrDefault(bin,"Ngân hàng BIN "+bin);}
 private static ApiException invalid(String message){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PAYMENT_QR",message);}
}

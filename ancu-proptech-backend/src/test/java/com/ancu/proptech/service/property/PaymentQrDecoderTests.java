package com.ancu.proptech.service.property;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PaymentQrDecoderTests {
 static String tag(String id,String v){return id+String.format("%02d",v.length())+v;}
 public static String payload(String account,String amount){String bank=tag("00","970422")+tag("01",account);String raw=tag("00","01")+tag("01","11")+tag("38",tag("00","A000000727")+tag("01",bank)+tag("02","QRIBFTTA"))+tag("53","704")+tag("58","VN")+(amount==null?"":tag("54",amount))+"6304";return raw+String.format("%04X",PaymentQrDecoder.crc(raw));}
 @Test void decodesActualImageAndRetainsLeadingZeros()throws Exception{var matrix=new com.google.zxing.qrcode.QRCodeWriter().encode(payload("00123456789",null),com.google.zxing.BarcodeFormat.QR_CODE,500,500);var out=new java.io.ByteArrayOutputStream();com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix,"PNG",out);var d=new PaymentQrDecoder().decode(out.toByteArray());assertEquals("970422",d.bankBin());assertEquals("00123456789",d.accountNumber());assertEquals("",d.accountHolderName());}
 @Test void refusesBadChecksumFixedAmountAndNonImages(){var d=new PaymentQrDecoder();String raw=payload("00123456789",null);assertThrows(RuntimeException.class,()->d.parse(raw.substring(0,raw.length()-4)+"FFFF","image/png"));assertThrows(RuntimeException.class,()->d.parse(payload("123","5000000"),"image/png"));assertThrows(RuntimeException.class,()->d.decode("not an image".getBytes()));assertDoesNotThrow(()->d.parse(payload("123","0.00"),"image/png"));}
}

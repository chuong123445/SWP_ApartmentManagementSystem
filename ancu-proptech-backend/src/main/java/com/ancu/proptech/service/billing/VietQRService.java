package com.ancu.proptech.service.billing;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class VietQRService {

    private static final String BANK_ID = "MBBANK"; // Ngân hàng Quân Đội MBBank
    private static final String ACCOUNT_NO = "8889997788"; // Số TK chủ nhà
    private static final String ACCOUNT_NAME = "CTY CP BDT AN CU";

    /**
     * Sinh link QuickLink ảnh VietQR tự động theo chuẩn Napas247
     */
    public String generateQrUrl(BigDecimal amount, String invoiceId, String roomNumber) {
        String addInfo = URLEncoder.encode("AN CU " + roomNumber + " HD " + invoiceId, StandardCharsets.UTF_8);
        return String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                BANK_ID,
                ACCOUNT_NO,
                amount.toPlainString(),
                addInfo,
                URLEncoder.encode(ACCOUNT_NAME, StandardCharsets.UTF_8)
        );
    }
}
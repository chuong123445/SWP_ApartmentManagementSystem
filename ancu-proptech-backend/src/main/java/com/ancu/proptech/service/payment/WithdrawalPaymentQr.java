package com.ancu.proptech.service.payment;

import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.payment.OwnerWithdrawal;
import com.ancu.proptech.service.property.PaymentQrDecoder;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;

final class WithdrawalPaymentQr {
    private WithdrawalPaymentQr() {}

    static byte[] png(OwnerWithdrawal withdrawal) {
        String bankBin = PaymentQrDecoder.bankBin(withdrawal.getBank()).orElseThrow(WithdrawalPaymentQr::unavailable);
        String account = withdrawal.getAccountNumber();
        String amount = withdrawal.getAmount().toBigIntegerExact().toString();
        if (!account.matches("[A-Za-z0-9]{1,34}") || !amount.matches("[1-9][0-9]{0,12}")) throw unavailable();

        String beneficiary = field("00", bankBin) + field("01", account);
        String network = field("00", "A000000727") + field("01", beneficiary) + field("02", "QRIBFTTA");
        String reference = "RUT " + withdrawal.getId();
        String payload = field("00", "01") + field("01", "12") + field("38", network)
                + field("53", "704") + field("54", amount) + field("58", "VN")
                + field("62", field("08", reference)) + "6304";
        payload += String.format(Locale.ROOT, "%04X", PaymentQrDecoder.crc(payload));

        try (var output = new ByteArrayOutputStream()) {
            var matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 320, 320);
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (IOException | WriterException error) {
            throw unavailable();
        }
    }

    private static String field(String tag, String value) {
        // Values in this payload are ASCII, so character and byte lengths match.
        return tag + String.format(Locale.ROOT, "%02d", value.length()) + value;
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.CONFLICT, "WITHDRAWAL_QR_UNAVAILABLE",
                "Không tạo được QR cho yêu cầu này. Hãy dùng thông tin tài khoản để chuyển khoản.");
    }
}

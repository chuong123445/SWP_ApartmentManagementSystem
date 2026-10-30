package com.ancu.proptech.exception.common;
import com.ancu.proptech.exception.auth.AuthException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice(basePackages = {"com.ancu.proptech.controller.identity", "com.ancu.proptech.controller.apartment", "com.ancu.proptech.controller.rental", "com.ancu.proptech.controller.property", "com.ancu.proptech.controller.billing", "com.ancu.proptech.controller.contract", "com.ancu.proptech.controller.maintenance", "com.ancu.proptech.controller.finance", "com.ancu.proptech.controller.notification"})
public class DiscoveryErrorHandler {
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(Exception e) { return error(HttpStatus.CONFLICT,"RESOURCE_CONFLICT","Dữ liệu đã tồn tại hoặc vừa thay đổi. Hãy tải lại trước khi thử tiếp."); }
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException e) { return error(e.status, e.code, e.getMessage()); }
    @ExceptionHandler(AuthException.class)
    ResponseEntity<?> auth(AuthException e) { return error(e.status, e.code, e.getMessage()); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    ResponseEntity<?> validation(Exception e) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ hoặc chứa trường không được phép."); }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<?> tooLarge(Exception e) { return error(HttpStatus.PAYLOAD_TOO_LARGE,"FILE_TOO_LARGE","Yêu cầu tải lên vượt giới hạn dung lượng. Chứng từ tài sản tối đa 10 MB/file."); }
    private ResponseEntity<?> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("code", code, "message", message));
    }
}

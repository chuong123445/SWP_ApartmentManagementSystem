package com.ancu.proptech.exception.common;
import com.ancu.proptech.exception.auth.AuthException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice(basePackages = {"com.ancu.proptech.controller.apartment", "com.ancu.proptech.controller.rental", "com.ancu.proptech.controller.property", "com.ancu.proptech.controller.billing", "com.ancu.proptech.controller.contract"})
public class DiscoveryErrorHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException e) { return error(e.status, e.code, e.getMessage()); }
    @ExceptionHandler(AuthException.class)
    ResponseEntity<?> auth(AuthException e) { return error(e.status, e.code, e.getMessage()); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> validation(Exception e) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ hoặc chứa trường không được phép."); }
    private ResponseEntity<?> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("code", code, "message", message));
    }
}

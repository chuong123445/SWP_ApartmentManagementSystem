package com.ancu.proptech.exception.auth;
import com.ancu.proptech.controller.auth.AccountController;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice(assignableTypes={AccountController.class,com.ancu.proptech.controller.auth.AccountSecurityController.class})
public class AccountErrorHandler {
    @ExceptionHandler(AuthException.class) public ResponseEntity<?> auth(AuthException e){var builder=ResponseEntity.status(e.status).cacheControl(CacheControl.noStore());if(e.status==HttpStatus.TOO_MANY_REQUESTS)builder.header("Retry-After","60");return builder.body(Map.of("code",e.code,"message",e.getMessage()));}
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class}) public ResponseEntity<?> validation(Exception e){return ResponseEntity.badRequest().body(Map.of("code","VALIDATION_ERROR","message","Dữ liệu không hợp lệ hoặc có trường không được phép."));}
    @ExceptionHandler(DataIntegrityViolationException.class) public ResponseEntity<?> duplicate(Exception e){return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code","CONTACT_IN_USE","message","Email hoặc số điện thoại đã được sử dụng."));}
}

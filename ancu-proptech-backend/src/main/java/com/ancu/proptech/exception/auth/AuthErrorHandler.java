package com.ancu.proptech.exception.auth;

import com.ancu.proptech.controller.auth.AuthController;

import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthErrorHandler {
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> malformed(Exception error) {
        return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(Map.of("code","VALIDATION_ERROR","message","Dữ liệu không hợp lệ hoặc có trường không được phép."));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> duplicate(Exception error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore()).body(Map.of("code","CONTACT_IN_USE","message","Email đã được sử dụng."));
    }
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<?> authError(AuthException error) {
        return ResponseEntity.status(error.status).cacheControl(CacheControl.noStore())
                .body(Map.of("code", error.code, "message", error.getMessage()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validationError(MethodArgumentNotValidException error) {
        var fields = error.getBindingResult().getFieldErrors().stream()
                .map(field -> Map.of("field", field.getField(), "message", "Giá trị không hợp lệ")).toList();
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION_ERROR",
                "message", "Vui lòng kiểm tra email và mật khẩu.", "fieldErrors", fields));
    }
}

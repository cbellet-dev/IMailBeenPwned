package com.osint.email.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler — catches any unhandled exception from controllers,
 * logs the full stack trace, and returns a structured JSON error body instead
 * of Spring's default blank 500 page.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex) {
        log.error("Unhandled exception in controller", ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", 500);
        body.put("error", ex.getClass().getSimpleName());
        body.put("message", ex.getMessage());

        // Include cause chain for easier diagnosis
        Throwable cause = ex.getCause();
        if (cause != null) {
            body.put("cause", cause.getClass().getSimpleName() + ": " + cause.getMessage());
        }

        return ResponseEntity.internalServerError().body(body);
    }
}

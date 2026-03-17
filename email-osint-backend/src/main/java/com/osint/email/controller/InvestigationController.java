package com.osint.email.controller;

import com.osint.email.model.EmailInvestigationRequest;
import com.osint.email.model.EmailInvestigationResult;
import com.osint.email.service.AggregatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing the email OSINT investigation endpoint.
 *
 * POST /api/investigate/email
 * Body: { "email": "user@example.com" }
 */
@Slf4j
@RestController
@RequestMapping("/api/investigate")
@CrossOrigin(origins = "*")   // Lock down to specific origin in production
@RequiredArgsConstructor
public class InvestigationController {

    private final AggregatorService aggregatorService;

    /**
     * Investigates an email address using all available OSINT sources.
     *
     * @param request JSON body containing the email field
     * @return full investigation result with risk score, breaches, domain info, etc.
     */
    @PostMapping("/email")
    public ResponseEntity<EmailInvestigationResult> investigate(
            @RequestBody EmailInvestigationRequest request) {

        log.info("Received investigation request for email: {}", request.getEmail());

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        EmailInvestigationResult result = aggregatorService.investigate(request.getEmail());
        return ResponseEntity.ok(result);
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\":\"UP\",\"service\":\"IMailBeenPwned\"}");
    }
}

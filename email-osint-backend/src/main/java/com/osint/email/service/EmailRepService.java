package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Queries EmailRep.io for email reputation intelligence.
 * Docs: https://emailrep.io/docs
 *
 * API key goes in application.properties: emailrep.api.key
 * Free tier: 100 requests/day (anonymous) or more with an API key.
 */
@Slf4j
@Service
public class EmailRepService {

    private final WebClient webClient;

    @Value("${emailrep.api.key:}")
    private String apiKey;

    public EmailRepService(WebClient.Builder builder,
                           @Value("${emailrep.api.url:https://emailrep.io}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    /**
     * Fetches reputation data for an email from EmailRep.io.
     * Result fields:
     *   - reputation     : "high" | "medium" | "low" | "none"
     *   - suspicious     : boolean
     *   - references     : number of times referenced online
     *   - profiles       : list of social platforms found (twitter, github, etc.)
     *   - blacklisted    : boolean
     *   - maliciousActivity : boolean
     *   - freeprovider   : boolean (gmail/yahoo/etc.)
     *   - spoofable      : boolean (domain lacks SPF/DMARC)
     */
    @SuppressWarnings("unchecked")
    public EmailRepResult query(String email) {
        log.debug("EmailRep.io query for: {}", email);
        try {
            WebClient.RequestHeadersSpec<?> request = webClient.get()
                    .uri("/{email}", email)
                    .header("User-Agent", "IMailBeenPwned-OSINT-Tool/1.0");

            // Add API key if configured (higher rate limit)
            if (apiKey != null && !apiKey.isBlank()) {
                request = webClient.get()
                        .uri("/{email}", email)
                        .header("User-Agent", "IMailBeenPwned-OSINT-Tool/1.0")
                        .header("Key", apiKey);
            }

            Map<String, Object> response = request
                    .retrieve()
                    .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(),
                            r -> {
                                log.warn("EmailRep.io error: {}", r.statusCode());
                                return Mono.empty();
                            })
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorReturn(Collections.emptyMap())
                    .block();

            if (response == null || response.isEmpty()) return EmailRepResult.empty();

            String reputation = getString(response, "reputation");
            boolean suspicious = Boolean.TRUE.equals(response.get("suspicious"));

            // Drill into "details" sub-object
            Map<String, Object> details = response.containsKey("details")
                    ? (Map<String, Object>) response.get("details")
                    : Collections.emptyMap();

            int references = details.get("references") instanceof Number n ? n.intValue() : 0;
            boolean blacklisted = Boolean.TRUE.equals(details.get("blacklisted"));
            boolean maliciousActivity = Boolean.TRUE.equals(details.get("malicious_activity"));
            boolean freeProvider = Boolean.TRUE.equals(details.get("free_provider"));
            boolean spoofable = Boolean.TRUE.equals(details.get("spoofable"));

            List<String> profiles = details.containsKey("profiles")
                    ? (List<String>) details.get("profiles")
                    : Collections.emptyList();

            log.debug("EmailRep for {} → reputation={} suspicious={}", email, reputation, suspicious);
            return new EmailRepResult(reputation, suspicious, references,
                    profiles, blacklisted, maliciousActivity, freeProvider, spoofable);

        } catch (Exception e) {
            log.error("EmailRep.io query failed: {}", e.getMessage());
            return EmailRepResult.empty();
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "none";
    }

    public record EmailRepResult(
            String reputation,
            boolean suspicious,
            int references,
            List<String> profiles,
            boolean blacklisted,
            boolean maliciousActivity,
            boolean freeProvider,
            boolean spoofable) {

        public static EmailRepResult empty() {
            return new EmailRepResult("none", false, 0,
                    Collections.emptyList(), false, false, false, false);
        }
    }
}

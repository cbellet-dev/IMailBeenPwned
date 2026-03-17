package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

/**
 * Queries BreachDirectory.org (Free tier) for leaked data.
 */
@Slf4j
@Service
public class BreachDirectoryService {

    private final WebClient webClient;

    public BreachDirectoryService(WebClient.Builder builder) {
        // Free tier often allows search by email
        this.webClient = builder.baseUrl("https://breachdirectory.org/api/v2")
                .build();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> query(String email) {
        log.debug("BreachDirectory query for: {}", email);
        try {
            // Note: Many free OSINT APIs fluctuate. This is a generic implementation.
            Map<String, Object> response = webClient.get()
                    .uri("/search?email={email}", email)
                    .retrieve()
                    .onStatus(s -> s.isError(), r -> Mono.empty())
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorReturn(Collections.emptyMap())
                    .block();

            return response != null ? response : Collections.emptyMap();
        } catch (Exception e) {
            log.error("BreachDirectory failed: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}

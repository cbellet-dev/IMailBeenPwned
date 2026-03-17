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
 * Queries the LeakCheck.net API for credential leaks tied to an email.
 * Docs: https://leakcheck.net/api
 *
 * API key goes in application.properties: leakcheck.api.key
 */
@Slf4j
@Service
public class LeakCheckService {

    private final WebClient webClient;

    public LeakCheckService(WebClient.Builder builder,
            @Value("${leakcheck.api.url:https://leakcheck.net/api/public}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    /**
     * Result fields: found (boolean), sources (list of source names), count (int)
     */
    @SuppressWarnings("unchecked")
    public LeakCheckResult query(String email) {
        log.debug("LeakCheck query for: {}", email);
        try {
            Map<String, Object> response = webClient.get()
                    .uri("?check={email}", email)
                    .retrieve()
                    .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(),
                            r -> {
                                log.warn("LeakCheck API error: {}", r.statusCode());
                                return Mono.empty();
                            })
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorReturn(Collections.emptyMap())
                    .block();

            if (response == null || response.isEmpty())
                return LeakCheckResult.empty();

            boolean found = Boolean.TRUE.equals(response.get("found"));
            int count = response.get("found_count") instanceof Number n ? n.intValue() : 0;
            List<String> sources = Collections.emptyList();
            if (response.containsKey("sources")) {
                List<Object> raw = (List<Object>) response.get("sources");
                sources = raw.stream()
                        .map(s -> {
                            if (s instanceof Map<?, ?> map) {
                                Object name = map.get("name");
                                return name != null ? name.toString() : "Desconocido";
                            }
                            return s.toString();
                        })
                        .toList();
            }

            log.debug("LeakCheck for {} → found={} count={}", email, found, count);
            return new LeakCheckResult(found, count, sources);

        } catch (Exception e) {
            log.error("LeakCheck query failed: {}", e.getMessage());
            return LeakCheckResult.empty();
        }
    }

    public record LeakCheckResult(boolean found, int count, List<String> sources) {
        public static LeakCheckResult empty() {
            return new LeakCheckResult(false, 0, Collections.emptyList());
        }
    }
}

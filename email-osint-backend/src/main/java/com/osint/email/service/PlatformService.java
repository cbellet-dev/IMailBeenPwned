package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

/**
 * Checks platform-level presence for an email address:
 * - Gravatar: does a profile image exist?
 * - Pastebin dumps: has the email appeared in leaked pastes?
 * - Disposable email: is the domain a known throwaway provider?
 */
@Slf4j
@Service
public class PlatformService {

    private final WebClient webClient;

    @Value("${gravatar.base.url}")
    private String gravatarBaseUrl;

    @Value("${pastebin.search.url}")
    private String pastebinSearchUrl;

    // ── Known disposable email domains ───────────────────────────────────────
    private static final Set<String> DISPOSABLE_DOMAINS = Set.of(
            "mailinator.com", "guerrillamail.com", "guerrillamail.info",
            "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
            "guerrillamail.org", "tempmail.com", "temp-mail.org",
            "throwam.com", "throwaway.email", "yopmail.com",
            "sharklasers.com", "guerrillamailblock.com", "grr.la",
            "spam4.me", "trashmail.com", "trashmail.me", "trashmail.at",
            "trashmail.io", "trashmail.net", "mailnull.com",
            "spamgourmet.com", "getairmail.com", "fakeinbox.com",
            "dispostable.com", "mailnesia.com", "maildrop.cc",
            "discard.email", "spambox.us", "spamfree24.org",
            "mohmal.com", "mintemail.com", "owlpic.com",
            "10minutemail.com", "10minutemail.net", "10minutemail.org");

    public PlatformService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    // ── Gravatar ──────────────────────────────────────────────────────────────

    /**
     * Checks if a Gravatar avatar exists for the email.
     *
     * @param email email address
     * @return array [exists (Boolean), md5hash (String)]
     */
    public Object[] checkGravatar(String email) {
        String hash = md5Hex(email.trim().toLowerCase());
        String url = gravatarBaseUrl + "/" + hash + "?d=404";

        try {
            Integer statusCode = webClient.get()
                    .uri(url)
                    .exchangeToMono(response -> Mono.just(response.statusCode().value()))
                    .timeout(Duration.ofSeconds(5))
                    .onErrorReturn(404)
                    .block();

            boolean exists = (statusCode != null && statusCode == 200);
            log.debug("Gravatar check for {} → hash={} exists={}", email, hash, exists);
            return new Object[]{exists, hash};

        } catch (Exception e) {
            log.warn("Gravatar check failed for {}: {}", email, e.getMessage());
            return new Object[]{false, hash};
        }
    }

    // ── Pastebin / PSBDMP Dumps ───────────────────────────────────────────────

    /**
     * Searches psbdmp.ws (public, no API key) for email mentions in paste dumps.
     *
     * @param email email address to search
     * @return array [found (Boolean), count (Integer)]
     */
    @SuppressWarnings("unchecked")
    public Object[] checkPastebin(String email) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(pastebinSearchUrl + "/" + email)
                    .retrieve()
                    .onStatus(s -> s.value() == 404, r -> Mono.empty())
                    .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), r -> Mono.empty())
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(8))
                    .onErrorReturn(Map.of("count", 0))
                    .block();

            if (response == null)
                return new Object[] { false, 0 };

            int count = 0;
            Object countVal = response.get("count");
            if (countVal instanceof Number n) {
                count = n.intValue();
            }

            log.debug("Pastebin check for {} → count={}", email, count);
            return new Object[] { count > 0, count };

        } catch (Exception e) {
            log.warn("Pastebin check failed for {}: {}", email, e.getMessage());
            return new Object[] { false, 0 };
        }
    }

    // ── Disposable Email ──────────────────────────────────────────────────────

    /**
     * Checks if the email's domain is a known disposable/throwaway provider.
     */
    public boolean isDisposable(String email) {
        if (email == null || !email.contains("@"))
            return false;
        String domain = email.substring(email.lastIndexOf('@') + 1).toLowerCase().trim();
        boolean disposable = DISPOSABLE_DOMAINS.contains(domain);
        log.debug("Disposable check for domain {} → {}", domain, disposable);
        return disposable;
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private String md5Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }
}

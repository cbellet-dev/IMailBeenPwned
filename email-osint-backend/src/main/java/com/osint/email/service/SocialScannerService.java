package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Checks for the existence of a username on various social media platforms.
 * (Sherlock-lite implementation)
 */
@Slf4j
@Service
public class SocialScannerService {

    private final WebClient webClient;

    // Platform patterns [Name, URL_Template]
    private static final Map<String, String> PLATFORMS = Map.of(
            "Twitter (X)", "https://twitter.com/%s",
            "Instagram", "https://www.instagram.com/%s/",
            "TikTok", "https://www.tiktok.com/@%s",
            "GitHub", "https://github.com/%s",
            "Pinterest", "https://www.pinterest.com/%s/",
            "Linktree", "https://linktr.ee/%s",
            "GitLab", "https://gitlab.com/%s",
            "Medium", "https://medium.com/@%s"
    );

    public SocialScannerService(WebClient.Builder builder) {
        this.webClient = builder
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Tool/1.0")
                .build();
    }

    /**
     * Scans platforms for the given username.
     * Returns a list of platforms where the user likely exists.
     */
    public List<String> scan(String username) {
        if (username == null || username.isBlank()) return List.of();

        log.debug("Scanning social platforms for username: {}", username);

        List<CompletableFuture<String>> futures = PLATFORMS.entrySet().stream()
                .map(entry -> checkPlatform(entry.getKey(), String.format(entry.getValue(), username)))
                .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        List<String> found = new ArrayList<>();
        for (var future : futures) {
            try {
                String result = future.get();
                if (result != null) found.add(result);
            } catch (Exception ignored) {}
        }

        return found;
    }

    private CompletableFuture<String> checkPlatform(String name, String url) {
        return webClient.get()
                .uri(url)
                .exchangeToMono(response -> {
                    // 200 is a hit. 404 is a miss. 
                    // Some platforms redirect to login (302), we treat that as "maybe/hit" or "private".
                    if (response.statusCode().is2xxSuccessful()) {
                        return Mono.just(name);
                    }
                    return Mono.empty();
                })
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(e -> Mono.empty())
                .toFuture();
    }
}

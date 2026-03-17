package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Uses Groq's API (Llama 3 or Mixtral) to analyze the raw OSINT data
 * and provide a concise, security-focused summary of the findings.
 */
@Slf4j
@Service
public class AiAnalysisService {

    private final WebClient webClient;
    private final String apiKey;
    private final boolean isEnabled;

    public AiAnalysisService(WebClient.Builder builder,
                             @Value("${groq.api.url:https://api.groq.com/openai/v1}") String baseUrl,
                             @Value("${groq.api.key:}") String apiKey) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.isEnabled = apiKey != null && !apiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    public String analyze(String email, int riskScore, int leaksCount, boolean isDisposable, boolean inPastebin) {
        if (!isEnabled) {
            return "El análisis de IA está desactivado (falta la clave API de Groq).";
        }

        log.debug("Generando análisis de IA para el correo: {}", email);

        String prompt = String.format(
            "Eres un analista experto de ciberseguridad. Analiza brevemente el siguiente correo encontrado en una investigación OSINT. " +
            "Correo: %s | Puntuación de Riesgo: %d/100 | Filtraciones encontradas: %d | Correo temporal: %b | Aparece en Pastebin: %b. " +
            "Responde en un solo párrafo corto y directo (máximo 3 frases) indicando el nivel de peligro de privacidad para el usuario.",
            email, riskScore, leaksCount, isDisposable, inPastebin
        );

        Map<String, Object> body = Map.of(
            "model", "llama-3.1-8b-instant", // Modelo actualizado y activo de Groq
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "temperature", 0.5,
            "max_tokens", 150
        );

        try {
            Map<String, Object> response = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), r -> Mono.empty())
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
            return "No se pudo generar un análisis concluyente.";

        } catch (Exception e) {
            log.error("Fallo al contactar con la API de IA (Groq): {}", e.getMessage());
            return "Error al generar el análisis de IA por timeout o fallo de red.";
        }
    }
}

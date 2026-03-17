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
 * Servicio encargado de interactuar con la API pública de GitHub para buscar usuarios
 * vinculados a una dirección de correo electrónico específica.
 * No requiere token de API para realizar búsquedas públicas de bajo volumen.
 */
@Slf4j
@Service
public class GithubService {

    private final WebClient webClient;

    /**
     * Constructor del servicio.
     * Configura el cliente HTTP (WebClient) con la URL base de GitHub
     * y las cabeceras requeridas para aceptar el formato JSON de la API v3.
     *
     * @param builder Constructor de WebClient inyectado por Spring.
     * @param baseUrl URL base de la API (por defecto: https://api.github.com).
     */
    public GithubService(WebClient.Builder builder,
                       @Value("${github.api.url:https://api.github.com}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl)
                .defaultHeader("Accept", "application/vnd.github.v3+json")
                .build();
    }

    /**
     * Busca usuarios en GitHub mediante un correo electrónico.
     * Primero realiza una consulta general y, si obtiene coincidencias, extrae la URL 
     * del primer perfil resultante para obtener todos sus datos públicos.
     *
     * @param email El correo electrónico a investigar.
     * @return Un mapa que contiene los datos del perfil del usuario, o un mapa vacío si no hay coincidencias o hay error.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> searchByEmail(String email) {
        log.debug("Iniciando búsqueda en GitHub para el correo: {}", email);
        try {
            // Realiza la petición GET al endpoint de búsqueda de usuarios
            Map<String, Object> response = webClient.get()
                    .uri("/search/users?q={email} in:email", email)
                    .retrieve()
                    // Si el servidor de GitHub o nuestra petición fallan (4xx, 5xx), se silencia el error retornando un Mono vacío
                    .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), r -> Mono.empty())
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(10)) // Establecemos un límite de tiempo máximo de 10 segundos
                    .onErrorReturn(Collections.emptyMap()) // En caso de que exceda el tiempo o falle de otra forma, devuelve un mapa vacío
                    .block(); // Bloquea el hilo actual a la espera de la respuesta de manera síncrona

            // Valida si la respuesta es nula o no contiene la lista de usuarios clave ('items')
            if (response == null || !response.containsKey("items")) {
                return Collections.emptyMap();
            }

            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            // Si la lista de resultados está vacía, no hubo matches, retornamos mapa vacío
            if (items.isEmpty()) {
                return Collections.emptyMap();
            }

            // Obtenemos la URL de la API del perfil para el primer usuario que coincidió
            String userUrl = (String) items.get(0).get("url");
            
            // Delegamos a este método auxiliar la obtención del detalle integral del perfil
            return fetchFullProfile(userUrl);

        } catch (Exception e) {
            log.error("Fallo al buscar en GitHub por correo {}: {}", email, e.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Realiza una petición complementaria para obtener el perfil completo del usuario,
     * ya que la consulta de búsqueda devuelve solo datos muy básicos.
     *
     * @param url La URL del API del perfil del usuario (ej., https://api.github.com/users/username).
     * @return El mapa con todos los datos públicos disponibles del usuario, o vacío en caso de error.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchFullProfile(String url) {
        try {
            // Instancia un cliente ad-hoc para conectarse a esa URL particular del usuario
            return WebClient.create(url)
                    .get()
                    .header("Accept", "application/vnd.github.v3+json")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .cast((Class<Map<String, Object>>) (Class<?>) Map.class)
                    .timeout(Duration.ofSeconds(5)) // Límite de tiempo de 5 segundos al tratarse de un perfil individual
                    .onErrorReturn(Collections.emptyMap())
                    .block();
        } catch (Exception e) {
            log.error("Fallo al obtener el perfil completo desde la URL {}: {}", url, e.getMessage());
            return Collections.emptyMap();
        }
    }
}

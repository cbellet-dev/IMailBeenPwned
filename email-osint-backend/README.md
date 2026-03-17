# IMailBeenPwned - Email OSINT Backend

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2.3-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)

> Backend service for **IMailBeenPwned**, an advanced OSINT tool for investigating and analyzing email addresses across the web.

## 📖 Overview

The **IMailBeenPwned Backend** is a Spring Boot application designed to automatically gather intelligence about any given email address. It aggregates data from multiple public sources and APIs to build a comprehensive threat profile, checking for:

*   **Breaches & Leaks:** LeakCheck, BreachDirectory, Pastebin (PSBDMP).
*   **Reputation & Threat Intel:** EmailRep.io (spam, malicious activity, throwaway domains).
*   **Developer Footprint:** GitHub (publicly exposed emails on commits/profiles).
*   **Social & Platforms:** Gravatar (avatar existence) and a wide array of Social Media Platforms (X/Twitter, Instagram, TikTok, LinkedIn...).
*   **Domain Intelligence:** WHOIS data, SPF, DMARC, and MX records to determine spoofability.

---

## 🚀 Features

*   **Reactive & Non-Blocking HTTP Clients:** Built with Spring WebFlux (`WebClient`) for blazing-fast concurrent API requests.
*   **Aggregator Service:** A unified endpoint that concurrently schedules and retrieves data from all integrated OSINT modules, yielding a single cohesive JSON report.
*   **Risk Scoring:** Advanced heuristic algorithm that calculate a security "Risk Score" based on the severity of the findings (e.g., exposed passwords vs. just a Gravatar account).
*   **Global Exception Handling:** Clean and standardized error responses using Spring `@ControllerAdvice`.

---

## 🛠 Prerequisites

*   [Java 17](https://jdk.java.net/17/) or higher.
*   [Apache Maven](https://maven.apache.org/) 3.8+ (or use the included wrapper).
*   (Optional but recommended) API Keys for supported OSINT services (see Configuration).

---

## ⚙️ Configuration & Environment Variables

The project uses a standard `application.properties` configuration file. While most services are configured to use public/free endpoints by default, some require or offer extended rate limits via API keys.

1. Copy the example configuration file:
   ```bash
   cp application.properties.example src/main/resources/application.properties
   ```
2. Open `src/main/resources/application.properties` and add your API keys.

### Key Environment Variables

| Variable | Description |
| :--- | :--- |
| `server.port` | The port the backend will run on (Default: `8080`) |
| `leakcheck.api.key` | (Optional) Private API Key for LeakCheck.net |
| `emailrep.api.key` | (Optional) Private API Key for EmailRep.io (higher limits) |

> ⚠️ **Security Warning:** Never commit your `application.properties` with real API keys to a public repository. The `.gitignore` is set up to ignore `.env` files and IDE local configs.

---

## 🚦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/IMailBeenPwned.git
cd IMailBeenPwned/email-osint-backend
```

### 2. Build the project

To download dependencies and build the artifact, run:

```bash
mvn clean install
```
*(Skip tests using `mvn clean install -DskipTests` if necessary)*

### 3. Run the application

You can start the Spring Boot application using Maven:

```bash
mvn spring-boot:run
```

Alternatively, run the compiled `.jar` file directly:
```bash
java -jar target/email-osint-backend-1.0.0.jar
```

The server should start on `http://localhost:8080`.

---

## 📡 API Endpoints 

### `GET /api/v1/investigate?email={target_email}`

Initiates a full OSINT investigation for the provided email address.

**Example Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/investigate?email=test@example.com"
```

**Example Response:**
```json
{
  "email": "test@example.com",
  "riskScore": 85.0,
  "leaks": {
    "leakCheck": { ... },
    "breachDirectory": { ... }
  },
  "reputation": { ... },
  "domainInfo": {
    "domain": "example.com",
    "mx": "...",
    "spf": "...",
    "dmarc": "..."
  },
  "platforms": {
    "gravatarExists": true,
    "githubProfile": { ... },
    "socialMediaHits": ["Twitter", "GitHub"]
  }
}
```

---

## 🏗 Project Structure

```text
src/main/java/com/osint/email/
├── config/         # Spring Boot Configurations (CORS, WebClient beans)
├── controller/     # REST API Endpoints (GlobalExceptionHandler, InvestigationController)
├── model/          # DTOs and Response Objects (EmailInvestigationResult, etc.)
├── service/        # OSINT Integrations
│   ├── AggregatorService.java      # Master orchestrator
│   ├── BreachDirectoryService.java # Data breach lookups
│   ├── DomainService.java          # DNS, MX, SPF, DMARC, WHOIS
│   ├── EmailRepService.java        # Email reputation intelligence
│   ├── GithubService.java          # GitHub public email scraping
│   ├── LeakCheckService.java       # Credential leak checks
│   ├── PlatformService.java        # Throwaway domains, Gravatar, Pastebin
│   └── SocialScannerService.java   # Multi-platform social footprint
└── EmailOsintApplication.java      # Main Application Class
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to add a new OSINT aggregation source or improve the risk calculation heuristic:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Disclaimer: This tool is intended for legitimate OSINT tasks, security footprinting, and educational purposes. Ensure you have authorization before performing deep reconnaissance on external digital identities.*

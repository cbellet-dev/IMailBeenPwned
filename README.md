<div align="center">

# 🕵️‍♂️ IMailBeenPwned
**OSINT Email Investigation Suite**

[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=java&logoColor=white)](https://www.java.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2.3-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

## 📖 Overview

**IMailBeenPwned** is a full-stack Open Source Intelligence (OSINT) application designed to automate the reconnaissance and profiling of any given email address. 

Security researchers, penetration testers, and privacy advocates can use this tool to quickly aggregate an identity's digital footprint across data breaches, code repositories, domain intelligence, and social media platforms—yielding a unified threat profile and heuristic Risk Score.

### 🎯 Key Capabilities

*   **🔒 Credential Leaks & Breaches:** Queries `LeakCheck`, `BreachDirectory`, and `Pastebin` dumps for compromised passwords.
*   **🛡️ Reputation & Threat Intel:** Analyzes email reputation via `EmailRep.io` (detecting spam, malicious activity, and disposable/throwaway domains).
*   **💻 Developer Footprint:** Scrapes public `GitHub` exposure (commits, profiles).
*   **🌐 Domain Intelligence:** Performs fast DNS checks (MX, SPF, DMARC) and WHOIS lookups to assess email spoofablility and domain ownership.
*   **👾 Social Reconnaissance:** Validates the existence of accounts on platforms like X/Twitter, Instagram, TikTok, LinkedIn, and Gravatar using intelligent scraping and API checks.

---

## 🏗️ Architecture & Repository Structure

The project is built using a modern, decoupled architecture:

*   **Backend (`/email-osint-backend`):** A robust Java Spring Boot API using Spring WebFlux for highly concurrent, non-blocking requests to external OSINT providers.
*   **Frontend (`/imailbeenpwned-frontend`):** A rapid, responsive Single Page Application (SPA) built with React 19 and Vite. 

```text
├── email-osint-backend/       # Spring Boot 3.x REST API
│   ├── src/main/java/         # Java source code (Controllers, Services for OSINT)
│   ├── src/main/resources/    # Backend config (application.properties/*.env)
│   ├── pom.xml                # Maven dependencies
│   └── README.md              # Detailed Backend Documentation
│
├── imailbeenpwned-frontend/   # React 19 + Vite Frontend
│   ├── src/                   # React components and views
│   ├── package.json           # NPM dependencies
│   ├── vite.config.js         # Vite bundler configuration
│   └── eslint.config.js       # Linter configuration
│
└── README.md                  # This file
```

---

## 🚀 Quick Start Guide

You will need **[Java 17+](https://adoptium.net/)** (for the backend) and **[Node.js 20+](https://nodejs.org/en)** (for the frontend) installed on your machine.

### 1. Start the Backend API
The backend orchestrates the OSINT gathering. By default, it runs on `http://localhost:8080`.

```bash
# 1. Navigate to the backend directory
cd email-osint-backend

# 2. Setup your environment variables (Optional: Add API Keys in this file)
cp application.properties.example src/main/resources/application.properties

# 3. Build and Run the Spring Boot application
mvn clean install -DskipTests
mvn spring-boot:run
```
> *For detailed backend configuration, API keys, and endpoints, see the [Backend README](./email-osint-backend/README.md).*

### 2. Start the Frontend UI
The frontend provides the visual dashboard for the aggregated data. By default, it runs on `http://localhost:5173`.

```bash
# 1. Navigate to the frontend directory
cd imailbeenpwned-frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

### 3. Usage
Once both servers are running, open your browser to `http://localhost:5173`. Enter a target email address in the search bar and let the aggregator build the OSINT profile.

---

## 🔐 Environment & Security Best Practices

When working with OSINT tools, managing your API keys securely is critical.
*   **Never commit real API keys to GitHub.** 
*   Use `.env` files or strictly local `application.properties` that are excluded via `.gitignore`.
*   Both frontend and backend directories include comprehensive `.gitignore` files to prevent accidental credential leakage.

---

## 🤝 Contributing

We welcome contributions from the community—whether it's adding a new OSINT module, improving the React UI, or refining the heuristic Risk Score.

1. **Fork** the repository.
2. **Create** a new branch (`git checkout -b feature/NewOSINTModule`).
3. **Commit** your changes (`git commit -m 'feat: Add LinkedIn scraping module'`).
4. **Push** to the branch (`git push origin feature/NewOSINTModule`).
5. **Open** a Pull Request.

---

## 📜 License & Disclaimer

This project is licensed under the **MIT License**.

> **⚠️ DISCLAIMER:** This software is provided for educational purposes, security research, and authorized penetration testing only. The developers assume no liability and are not responsible for any misuse or damage caused by this program. Always ensure you have explicit permission before investigating domains or identities that do not belong to you.

package com.osint.email.service;

import com.osint.email.model.EmailInvestigationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

@Slf4j
@Service
public class AggregatorService {

    @Autowired
    private LeakCheckService leakCheck;
    @Autowired
    private EmailRepService emailRep;
    @Autowired
    private GithubService github;
    @Autowired
    private SocialScannerService socialScanner;
    @Autowired
    private DomainService domain;
    @Autowired
    private PlatformService platform;
    @Autowired
    private BreachDirectoryService breachDirectory;

    public EmailInvestigationResult investigate(String email) {
        log.info("Starting investigation for: {}", email);
        String targetDomain = domain.extractDomain(email);
        String username = domain.extractUsername(email);

        List<String> warnings = new ArrayList<>();

        // Parallel execution
        var leakFuture = safeCall(() -> leakCheck.query(email), "LeakCheck", warnings);
        var emailRepFuture = safeCall(() -> emailRep.query(email), "EmailRep", warnings);
        var githubFuture = safeCall(() -> github.searchByEmail(email), "GitHub", warnings);
        var socialFuture = safeCall(() -> socialScanner.scan(username), "Social Scanner", warnings);
        var domainFuture = safeCall(() -> domain.getDomainInfo(targetDomain), "Domain Info", warnings);
        var breachDirFuture = safeCall(() -> breachDirectory.query(email), "BreachDirectory", warnings);

        var platformFuture = CompletableFuture.supplyAsync(() -> {
            try {
                var grav = platform.checkGravatar(email);
                var paste = platform.checkPastebin(email);
                var disp = platform.isDisposable(email);
                return new Object[] { grav, paste, disp };
            } catch (Exception e) {
                warnings.add("Platform checks failed");
                return new Object[] { new Object[] { false, "" }, new Object[] { false, 0 }, false };
            }
        });

        // Use typed array for allOf
        CompletableFuture.allOf(leakFuture, emailRepFuture, githubFuture, socialFuture, domainFuture, platformFuture,
                breachDirFuture).join();

        // Join results
        var leaks = leakFuture.join();
        var rep = emailRepFuture.join();
        var ghProfile = githubFuture.join();
        var social = new ArrayList<>(socialFuture.join() != null ? socialFuture.join() : List.of());
        var domInfo = domainFuture.join();
        var plat = platformFuture.join();
        var breachDir = breachDirFuture.join();

        // ── Cross-Source Enrichment ──────────────────────────────────────────
        // If we found a name on GitHub, let's try to scan using that name too
        if (ghProfile != null && ghProfile.get("name") instanceof String fullName) {
            if (!fullName.isBlank()) {
                log.info("Enriching social scan with name from GitHub: {}", fullName);
                String nameHandle = fullName.toLowerCase().replace(" ", "");
                List<String> extraSocial = socialScanner.scan(nameHandle);
                for (String s : extraSocial) {
                    if (!social.contains(s))
                        social.add(s + " (via Name)");
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        Object[] gravInfo = (Object[]) plat[0];
        Object[] pasteInfo = (Object[]) plat[1];
        boolean isDisp = (boolean) plat[2];

        // Combine breach counts
        int countFromApi = (leaks != null ? leaks.count() : 0);
        int sourcesFound = (leaks != null ? leaks.sources().size() : 0);
        int totalLeaks = Math.max(countFromApi, sourcesFound);
        
        if (breachDir != null && breachDir.get("found") instanceof Boolean f && f) {
            totalLeaks += (breachDir.get("count") instanceof Number n ? n.intValue() : 1);
        }

        EmailInvestigationResult result = EmailInvestigationResult.builder()
                .email(email)
                .domain(targetDomain)
                .analysisTimestamp(LocalDateTime.now())
                .warnings(warnings)

                // Combined Leak Info
                .leakCheckFound(totalLeaks > 0)
                .leakCheckCount(totalLeaks)
                .leakCheckSources(leaks != null ? leaks.sources() : List.of())

                // GitHub & Social
                .githubFound(ghProfile != null && !ghProfile.isEmpty())
                .githubProfile(ghProfile)
                .socialProfiles(social != null ? social : List.of())

                // Gravatar & Pastebin
                .gravatarExists((boolean) gravInfo[0])
                .gravatarHash((String) gravInfo[1])
                .appearsInPastebin((boolean) pasteInfo[0])
                .pastebinCount((int) pasteInfo[1])
                .isDisposable(isDisp)

                // EmailRep (using Record fields)
                .emailReputation(rep != null ? rep.reputation() : "none")
                .emailRepSuspicious(rep != null && rep.suspicious())
                .emailRepBlacklisted(rep != null && rep.blacklisted())
                .emailRepMalicious(rep != null && rep.maliciousActivity())
                .emailRepProfiles(rep != null ? rep.profiles() : List.of())

                // Domain (using Record fields)
                .mxRecords(domInfo != null ? domInfo.mx() : "Unknown")
                .spfRecord(domInfo != null ? domInfo.spf() : "Unknown")
                .dmarcRecord(domInfo != null ? domInfo.dmarc() : "Unknown")
                .whoisInfo(domInfo != null ? domInfo.whois() : "Unknown")
                .build();

        calculateRisk(result);
        return result;
    }

    private void calculateRisk(EmailInvestigationResult r) {
        int score = 0;
        
        // Final Bug 1 Fix: Aggressive scaling (/4) using the reported count
        int leakCount = Math.max(r.getLeakCheckCount(), (r.getLeakCheckSources() != null ? r.getLeakCheckSources().size() : 0));
        if (leakCount > 0) {
            // 178 / 4 = 44 pts
            score += Math.min(leakCount / 4, 55);
        }
        
        if (r.isEmailRepSuspicious()) score += 10;
        if (r.isEmailRepMalicious())  score += 20;
        if (r.isAppearsInPastebin())  score += 15;
        if (r.isDisposable())         score += 10;
        if (r.isGithubFound())        score += 10;

        r.setRiskScore(Math.min(score, 100));
        if (score >= 70) r.setRiskLevel("CRITICAL");
        else if (score >= 45) r.setRiskLevel("HIGH");
        else if (score >= 20) r.setRiskLevel("MEDIUM");
        else r.setRiskLevel("LOW");
    }

    private <T> CompletableFuture<T> safeCall(Supplier<T> action, String serviceName, List<String> warnings) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return action.get();
            } catch (Exception e) {
                log.error("{} service failed: {}", serviceName, e.getMessage());
                synchronized (warnings) {
                    warnings.add(serviceName + " unavailable");
                }
                return null;
            }
        });
    }
}

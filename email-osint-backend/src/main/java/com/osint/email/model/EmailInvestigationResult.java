package com.osint.email.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailInvestigationResult {

    private String email;
    private String domain;
    private int riskScore;
    private String riskLevel;

    // ── Leak Information (Free/Public sources) ──────────────────────────────
    private boolean leakCheckFound;
    private int leakCheckCount;
    private List<String> leakCheckSources;

    // ── Social & Identity ──────────────────────────────────────────────────
    private boolean githubFound;
    private Map<String, Object> githubProfile;
    private List<String> socialProfiles; // List of platforms where the username exists
    
    private boolean gravatarExists;
    private String gravatarHash;

    // ── Reputation (EmailRep.io) ───────────────────────────────────────────
    private String emailReputation;
    private boolean emailRepSuspicious;
    private boolean emailRepBlacklisted;
    private boolean emailRepMalicious;
    private List<String> emailRepProfiles;

    // ── Domain & Infrastructure ─────────────────────────────────────────────
    private String mxRecords;
    private String spfRecord;
    private String dmarcRecord;
    private String whoisInfo;

    // ── Analysis Metadata ───────────────────────────────────────────────────
    private boolean appearsInPastebin;
    private int pastebinCount;
    private boolean isDisposable;
    private LocalDateTime analysisTimestamp;
    private List<String> warnings;
}

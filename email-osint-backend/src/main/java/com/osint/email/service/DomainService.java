package com.osint.email.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.InitialDirContext;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.*;

/**
 * Performs DNS-based and WHOIS lookups for an email's domain.
 */
@Slf4j
@Service
public class DomainService {

    private static final int WHOIS_PORT = 43;
    private static final int TIMEOUT_MS = 8000;
    private static final String IANA_WHOIS = "whois.iana.org";

    public record DomainResult(
            String domain,
            String mx,
            String spf,
            String dmarc,
            String whois
    ) {}

    public DomainResult getDomainInfo(String domain) {
        Map<String, Object> mxInfo = lookupMx(domain);
        String mx = mxInfo.get("mxRecords") != null ? mxInfo.get("mxRecords").toString() : "None";
        String spf = lookupSpf(domain);
        String dmarc = lookupDmarc(domain);
        String whois = lookupWhois(domain);

        return new DomainResult(domain, mx, spf, dmarc, whois);
    }

    public String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(email.lastIndexOf('@') + 1).toLowerCase().trim();
    }

    public String extractUsername(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(0, email.indexOf('@'));
    }

    // ── Internal Lookups ──────────────────────────────────────────────────────

    private Map<String, Object> lookupMx(String domain) {
        Map<String, Object> result = new HashMap<>();
        try {
            Hashtable<String, String> env = dnsEnv();
            InitialDirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes("dns:/" + domain, new String[]{"MX"});
            Attribute mxAttr = attrs.get("MX");

            if (mxAttr == null || mxAttr.size() == 0) {
                result.put("mxRecords", Collections.emptyList());
            } else {
                List<String> mxList = new ArrayList<>();
                NamingEnumeration<?> vals = mxAttr.getAll();
                while (vals.hasMore()) {
                    mxList.add(vals.next().toString());
                }
                result.put("mxRecords", mxList);
            }
        } catch (Exception e) {
            log.warn("MX lookup failed: {}", e.getMessage());
            result.put("mxRecords", Collections.emptyList());
        }
        return result;
    }

    private String lookupSpf(String domain) {
        try {
            Hashtable<String, String> env = dnsEnv();
            InitialDirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes("dns:/" + domain, new String[]{"TXT"});
            Attribute txtAttr = attrs.get("TXT");
            if (txtAttr == null) return null;

            NamingEnumeration<?> vals = txtAttr.getAll();
            while (vals.hasMore()) {
                String txt = vals.next().toString();
                if (txt.toLowerCase().contains("v=spf1")) return txt;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String lookupDmarc(String domain) {
        try {
            Hashtable<String, String> env = dnsEnv();
            InitialDirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes("dns:/" + ("_dmarc." + domain), new String[]{"TXT"});
            Attribute txtAttr = attrs.get("TXT");
            if (txtAttr == null) return null;

            NamingEnumeration<?> vals = txtAttr.getAll();
            while (vals.hasMore()) {
                String txt = vals.next().toString();
                if (txt.toUpperCase().contains("v=DMARC1")) return txt;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String lookupWhois(String domain) {
        try {
            String referralServer = getReferralWhoisServer(domain);
            if (referralServer == null) referralServer = IANA_WHOIS;
            String response = queryWhoisServer(referralServer, domain);
            return response != null && response.length() > 500 ? response.substring(0, 500) + "..." : response;
        } catch (Exception e) {
            return "Lookup failed";
        }
    }

    private String getReferralWhoisServer(String domain) {
        try {
            String response = queryWhoisServer(IANA_WHOIS, domain);
            if (response == null) return null;
            for (String line : response.split("\\n")) {
                if (line.trim().toLowerCase().startsWith("whois:")) {
                    return line.split(":", 2)[1].trim();
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String queryWhoisServer(String server, String query) throws Exception {
        try (Socket socket = new Socket(server, WHOIS_PORT);
             PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
            socket.setSoTimeout(TIMEOUT_MS);
            writer.println(query);
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line).append("\n");
            return sb.toString();
        }
    }

    private Hashtable<String, String> dnsEnv() {
        Hashtable<String, String> env = new Hashtable<>();
        env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
        env.put("com.sun.jndi.dns.timeout.initial", "3000");
        return env;
    }
}

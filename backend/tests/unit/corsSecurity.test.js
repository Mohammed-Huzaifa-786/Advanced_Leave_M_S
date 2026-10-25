// Test Suite: CORS Security, Allowed Origins & Preflight Hardening
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const express = require("express");
const {
  corsMiddleware,
  corsPreflight,
  privateNetworkAccess,
  getAllowedOrigins,
  isOriginAllowed,
} = require("../../config/cors");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

let serverInstance = null;
let activeBaseUrl = "";

async function setupServer() {
  const app = express();
  app.use(express.json());

  // Attach CORS & PNA middleware exactly as in server.js
  app.use(privateNetworkAccess);
  app.use(corsMiddleware);
  app.options("*", corsPreflight);

  // Test endpoint
  app.get("/api/test-cors", (req, res) => {
    res.json({ success: true, message: "CORS test response" });
  });

  app.post("/api/test-cors", (req, res) => {
    res.json({ success: true, data: req.body });
  });

  await new Promise((resolve) => {
    serverInstance = app.listen(0, "127.0.0.1", () => {
      const port = serverInstance.address().port;
      activeBaseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

function teardownServer() {
  if (serverInstance) {
    serverInstance.close();
  }
}

async function runCorsSecuritySuite() {
  console.log("==================================================================");
  console.log("TEST SUITE: CORS SECURITY, ORIGIN ALLOWLIST & PREFLIGHT HARDENING");
  console.log("==================================================================\n");

  await setupServer();

  try {
    // ==================================================================
    // 1. ALLOWLIST RESOLUTION & PARSING TESTS
    // ==================================================================
    console.log("\n--- 1. Origin Allowlist Resolution & Normalization ---");
    const allowed = getAllowedOrigins();
    assert(allowed.includes("http://localhost:5173"), "1A: Default Vite origin 'http://localhost:5173' is in allowlist");
    assert(allowed.includes("http://127.0.0.1:5173"), "1B: Default Vite IP origin 'http://127.0.0.1:5173' is in allowlist");
    assert(allowed.includes("http://localhost:3000"), "1C: Standard React origin 'http://localhost:3000' is in allowlist");
    assert(allowed.includes("http://127.0.0.1:3000"), "1D: Standard React IP origin 'http://127.0.0.1:3000' is in allowlist");

    // Trailing slash normalization
    assert(isOriginAllowed("http://localhost:5173/"), "1E: Trailing slash is normalized ('http://localhost:5173/')");
    assert(isOriginAllowed("  http://localhost:5173  "), "1F: Leading/trailing whitespace is trimmed");
    assert(!isOriginAllowed("https://malicious-site.com"), "1G: Disallowed origin correctly rejected by helper");
    assert(!isOriginAllowed(""), "1H: Empty origin correctly rejected by helper");
    assert(!isOriginAllowed(null), "1I: Null origin correctly rejected by helper");

    // ==================================================================
    // 2. LIVE HTTP: ALLOWED ORIGIN REQUESTS
    // ==================================================================
    console.log("\n--- 2. Legitimate Requests from Approved Origins ---");

    // Case 2A: Vite default origin
    const res2A = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "http://localhost:5173" },
    });
    assert(res2A.status === 200, "2A: Request from http://localhost:5173 succeeds (200)");
    assert(
      res2A.headers.get("access-control-allow-origin") === "http://localhost:5173",
      "2A: Access-Control-Allow-Origin strictly matches approved origin (http://localhost:5173)"
    );
    assert(
      res2A.headers.get("access-control-allow-credentials") === "true",
      "2A: Access-Control-Allow-Credentials is 'true' for approved origin"
    );

    // Case 2B: Vite IP origin
    const res2B = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "http://127.0.0.1:5173" },
    });
    assert(
      res2B.headers.get("access-control-allow-origin") === "http://127.0.0.1:5173",
      "2B: Access-Control-Allow-Origin returned for http://127.0.0.1:5173"
    );
    assert(
      res2B.headers.get("access-control-allow-credentials") === "true",
      "2B: Credentials enabled for http://127.0.0.1:5173"
    );

    // Case 2C: React port 3000 origin
    const res2C = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "http://localhost:3000" },
    });
    assert(
      res2C.headers.get("access-control-allow-origin") === "http://localhost:3000",
      "2C: Access-Control-Allow-Origin returned for http://localhost:3000"
    );

    // ==================================================================
    // 3. LIVE HTTP: DISALLOWED ORIGIN DEFENSE (NO ARBITRARY REFLECTION)
    // ==================================================================
    console.log("\n--- 3. Disallowed Origin Rejection (No Arbitrary Reflection) ---");

    // Case 3A: External attacker domain
    const res3A = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "https://evil-attacker.com" },
    });
    assert(
      res3A.headers.get("access-control-allow-origin") === null,
      "3A: Access-Control-Allow-Origin header is OMITTED for https://evil-attacker.com"
    );
    assert(
      res3A.headers.get("access-control-allow-credentials") === null,
      "3A: Access-Control-Allow-Credentials is NOT granted to untrusted origin"
    );

    // Case 3B: Subdomain/prefix spoofing attempt
    const res3B = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "http://localhost:5173.evil.com" },
    });
    assert(
      res3B.headers.get("access-control-allow-origin") === null,
      "3B: Spoofed origin 'http://localhost:5173.evil.com' receives NO allow header"
    );

    // Case 3C: Disallowed port on localhost
    const res3C = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
      headers: { Origin: "http://localhost:8080" },
    });
    assert(
      res3C.headers.get("access-control-allow-origin") === null,
      "3C: Disallowed port 'http://localhost:8080' receives NO allow header"
    );

    // ==================================================================
    // 4. NON-BROWSER & SAME-ORIGIN CLIENT COMPATIBILITY
    // ==================================================================
    console.log("\n--- 4. Non-Browser Clients (Missing Origin Header) ---");

    // Case 4A: Server-to-server or cURL request without Origin header
    const res4A = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "GET",
    });
    const data4A = await res4A.json();
    assert(res4A.status === 200, "4A: Request without Origin header succeeds with HTTP 200");
    assert(data4A.success === true, "4A: API response body received correctly");
    assert(
      res4A.headers.get("access-control-allow-origin") === null,
      "4A: No Access-Control-Allow-Origin header generated when Origin is omitted"
    );

    // ==================================================================
    // 5. PREFLIGHT (OPTIONS) REQUEST HANDLING
    // ==================================================================
    console.log("\n--- 5. Preflight (OPTIONS) Request Handling ---");

    // Case 5A: Preflight for allowed origin
    const preflightRes5A = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization",
      },
    });
    assert(
      preflightRes5A.status === 200 || preflightRes5A.status === 204,
      `5A: Preflight for allowed origin returns 200/204 (${preflightRes5A.status})`
    );
    assert(
      preflightRes5A.headers.get("access-control-allow-origin") === "http://localhost:5173",
      "5A: Preflight returns Access-Control-Allow-Origin: http://localhost:5173"
    );
    assert(
      preflightRes5A.headers.get("access-control-allow-credentials") === "true",
      "5A: Preflight returns Access-Control-Allow-Credentials: true"
    );
    assert(
      preflightRes5A.headers.get("access-control-allow-methods")?.includes("POST"),
      "5A: Preflight allows POST method"
    );

    // Case 5B: Preflight for disallowed origin
    const preflightRes5B = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://attacker.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert(
      preflightRes5B.headers.get("access-control-allow-origin") === null,
      "5B: Preflight for disallowed origin strictly OMITS Access-Control-Allow-Origin"
    );

    // ==================================================================
    // 6. PRIVATE NETWORK ACCESS (CHROME PNA) HARDENING
    // ==================================================================
    console.log("\n--- 6. Private Network Access (PNA) Hardening ---");

    // Case 6A: Allowed origin requesting PNA
    const pnaRes6A = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Private-Network": "true",
      },
    });
    assert(
      pnaRes6A.headers.get("access-control-allow-private-network") === "true",
      "6A: PNA header granted for trusted origin (http://localhost:5173)"
    );

    // Case 6B: Disallowed origin requesting PNA
    const pnaRes6B = await fetch(`${activeBaseUrl}/api/test-cors`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil-attacker.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Private-Network": "true",
      },
    });
    assert(
      pnaRes6B.headers.get("access-control-allow-private-network") === null,
      "6B: PNA header strictly BLOCKED for untrusted origin (https://evil-attacker.com)"
    );

    // ==================================================================
    // 7. ENVIRONMENT-DRIVEN PRODUCTION ORIGINS
    // ==================================================================
    console.log("\n--- 7. Dynamic Environment Config Verification ---");

    const customEnvList = [
      "https://portal.university.edu",
      "https://admin.university.edu",
    ];
    assert(
      isOriginAllowed("https://portal.university.edu", customEnvList),
      "7A: Custom production origin https://portal.university.edu is validated"
    );
    assert(
      isOriginAllowed("https://admin.university.edu/", customEnvList),
      "7B: Custom production origin with trailing slash is validated"
    );
    assert(
      !isOriginAllowed("https://other.university.edu", customEnvList),
      "7C: Unlisted origin in custom list is rejected"
    );

    // ==================================================================
    // 8. PRODUCTION VS NON-PRODUCTION ENVIRONMENT ISOLATION
    // ==================================================================
    console.log("\n--- 8. Production vs Non-Production Environment Isolation ---");

    const savedNodeEnv = process.env.NODE_ENV;
    const savedClientUrl = process.env.CLIENT_URL;
    const savedAllowedOrigins = process.env.ALLOWED_ORIGINS;

    try {
      // Scenario 8A: In non-production (e.g. development), local origins are included by default
      process.env.NODE_ENV = "development";
      delete process.env.CLIENT_URL;
      delete process.env.ALLOWED_ORIGINS;

      const devOrigins = getAllowedOrigins();
      assert(devOrigins.includes("http://localhost:5173"), "8A: Development environment includes http://localhost:5173");
      assert(devOrigins.includes("http://127.0.0.1:5173"), "8A: Development environment includes http://127.0.0.1:5173");
      assert(isOriginAllowed("http://localhost:5173"), "8A: Localhost is allowed in development mode");

      // Scenario 8B: In production, local development origins are NOT implicitly allowed
      process.env.NODE_ENV = "production";
      delete process.env.CLIENT_URL;
      delete process.env.ALLOWED_ORIGINS;

      const prodOriginsDefault = getAllowedOrigins();
      assert(
        !prodOriginsDefault.includes("http://localhost:5173") &&
        !prodOriginsDefault.includes("http://127.0.0.1:5173") &&
        !prodOriginsDefault.includes("http://localhost:3000"),
        "8B: Production environment does NOT implicitly include localhost origins"
      );
      assert(!isOriginAllowed("http://localhost:5173"), "8B: Localhost is rejected by default in production");
      assert(!isOriginAllowed("http://127.0.0.1:5173"), "8B: 127.0.0.1 is rejected by default in production");

      // Scenario 8C: In production, explicitly configured origins (CLIENT_URL & ALLOWED_ORIGINS) are allowed
      process.env.NODE_ENV = "production";
      process.env.CLIENT_URL = "https://student-portal.college.edu";
      process.env.ALLOWED_ORIGINS = "https://admin-portal.college.edu, https://faculty.college.edu/";

      const prodConfiguredOrigins = getAllowedOrigins();
      assert(
        prodConfiguredOrigins.includes("https://student-portal.college.edu"),
        "8C: Production explicitly configured CLIENT_URL is allowed"
      );
      assert(
        prodConfiguredOrigins.includes("https://admin-portal.college.edu"),
        "8C: Production explicitly configured ALLOWED_ORIGINS item 1 is allowed"
      );
      assert(
        prodConfiguredOrigins.includes("https://faculty.college.edu"),
        "8C: Production explicitly configured ALLOWED_ORIGINS item 2 (trailing slash stripped) is allowed"
      );
      assert(
        isOriginAllowed("https://student-portal.college.edu"),
        "8C: isOriginAllowed verifies configured production CLIENT_URL"
      );
      assert(
        isOriginAllowed("https://admin-portal.college.edu"),
        "8C: isOriginAllowed verifies configured production ALLOWED_ORIGINS"
      );

      // Scenario 8D: Untrusted origins remain strictly blocked in production
      assert(
        !isOriginAllowed("https://evil-attacker.com"),
        "8D: Untrusted origin is strictly blocked in production"
      );
      assert(
        !isOriginAllowed("http://localhost:5173"),
        "8D: Localhost remains blocked in production even when other origins are configured"
      );
    } finally {
      // Restore original environment variables to prevent contamination
      if (savedNodeEnv !== undefined) {
        process.env.NODE_ENV = savedNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      if (savedClientUrl !== undefined) {
        process.env.CLIENT_URL = savedClientUrl;
      } else {
        delete process.env.CLIENT_URL;
      }
      if (savedAllowedOrigins !== undefined) {
        process.env.ALLOWED_ORIGINS = savedAllowedOrigins;
      } else {
        delete process.env.ALLOWED_ORIGINS;
      }
    }

  } catch (err) {
    console.error("Test execution exception:", err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    teardownServer();
  }

  console.log("\n==================================================================");
  console.log(`CORS SECURITY SUITE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) process.exit(1);
}

runCorsSecuritySuite();

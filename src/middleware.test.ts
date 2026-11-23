import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { middleware } from "./middleware";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return new TextEncoder().encode("sanjagh-default-secret-key-at-least-32-chars-long");
  }
  return new TextEncoder().encode(secret);
}

async function createTestToken(role: "ADMIN" | "MANAGER" | "SALES"): Promise<string> {
  return new SignJWT({
    sessionId: "sess-test",
    userId: "usr-test",
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(getJwtSecret());
}

describe("Middleware Route Protection", () => {
  it("redirects unauthenticated users from protected routes to /login", async () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows unauthenticated users to access /login", async () => {
    const req = new NextRequest("http://localhost:3000/login");
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });

  it("redirects authenticated users away from /login to /", async () => {
    const token = await createTestToken("SALES");
    const req = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: `sanjagh_session=${token}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("blocks SALES users from accessing /team, /campaigns, /automations, and /users", async () => {
    const token = await createTestToken("SALES");

    const restrictedPaths = ["/team", "/campaigns", "/automations", "/users"];
    for (const path of restrictedPaths) {
      const req = new NextRequest(`http://localhost:3000${path}`, {
        headers: { cookie: `sanjagh_session=${token}` },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/");
    }
  });

  it("blocks MANAGER users from accessing /users but allows /team", async () => {
    const token = await createTestToken("MANAGER");

    // /users should be blocked
    const reqUsers = new NextRequest("http://localhost:3000/users", {
      headers: { cookie: `sanjagh_session=${token}` },
    });
    const resUsers = await middleware(reqUsers);
    expect(resUsers.status).toBe(307);
    expect(resUsers.headers.get("location")).toBe("http://localhost:3000/");

    // /team should be allowed
    const reqTeam = new NextRequest("http://localhost:3000/team", {
      headers: { cookie: `sanjagh_session=${token}` },
    });
    const resTeam = await middleware(reqTeam);
    expect(resTeam.status).toBe(200);
  });

  it("allows ADMIN users to access /users", async () => {
    const token = await createTestToken("ADMIN");

    const req = new NextRequest("http://localhost:3000/users", {
      headers: { cookie: `sanjagh_session=${token}` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});

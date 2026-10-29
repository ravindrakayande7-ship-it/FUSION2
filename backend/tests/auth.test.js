import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { getJWTSecret } from '../config/jwt.js';
import { fallbackStore } from '../services/storageFallback.js';
import { register, login } from '../controllers/authController.js';

describe('Backend Auth & JWT Security Tests', () => {
  beforeEach(() => {
    fallbackStore.reset();
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEMO_TOKENS = 'false';
  });

  it('generates and verifies valid JWT token with user payload', () => {
    const payload = { id: 'usr-1', email: 'owner@fusioncoffee.in', role: 'Owner' };
    const token = generateToken(payload);
    assert.ok(token);
    assert.equal(typeof token, 'string');

    const decoded = verifyToken(token);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  it('rejects tampered or malformed tokens with JsonWebTokenError', () => {
    assert.throws(() => {
      verifyToken('tampered.jwt.payload');
    });
  });

  it('rejects expired JWT tokens with TokenExpiredError', () => {
    const expiredToken = jwt.sign(
      { id: 'usr-1', role: 'Owner' },
      getJWTSecret(),
      { expiresIn: '-1s' }
    );
    assert.throws(
      () => {
        verifyToken(expiredToken);
      },
      (err) => err.name === 'TokenExpiredError'
    );
  });

  it('authorize middleware permits users with the required role', () => {
    const middleware = authorize('Owner', 'Manager');
    let calledNext = false;
    const req = { user: { role: 'Owner' } };
    const res = {};
    middleware(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  });

  it('authorize middleware blocks users lacking the required role with 403', () => {
    const middleware = authorize('Owner');
    let statusCode = null;
    let jsonResponse = null;
    const req = { user: { role: 'Barista' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    middleware(req, res, () => {});
    assert.equal(statusCode, 403);
    assert.equal(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Forbidden/);
  });

  it('authorize middleware returns 401 when req.user is unauthenticated', () => {
    const middleware = authorize('Owner');
    let statusCode = null;
    const req = {};
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    middleware(req, res, () => {});
    assert.equal(statusCode, 401);
  });

  it('rejects demo-role-* tokens when ALLOW_DEMO_TOKENS is false or in production', async () => {
    process.env.ALLOW_DEMO_TOKENS = 'false';
    const req = {
      headers: { authorization: 'Bearer demo-role-Owner' },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await authenticate(req, res, () => {});
    assert.equal(statusCode, 403);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /Demo tokens.*strictly disabled/);
  });

  it('authenticate middleware rejects unknown user id claims even with signed token', async () => {
    // Generate valid signed token for non-existent user
    const ghostToken = jwt.sign(
      { id: 'usr-non-existent-ghost', email: 'ghost@fusioncoffee.in', role: 'Owner' },
      getJWTSecret(),
      { expiresIn: '1h' }
    );
    const req = {
      headers: { authorization: `Bearer ${ghostToken}` },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await authenticate(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /does not exist/);
  });

  it('login rejects wrong password and removes universal backdoor bypass', async () => {
    // Attempt login with wrong password
    const req = {
      body: {
        email: 'owner@fusioncoffee.in',
        password: 'incorrectPassword999',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await login(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /Invalid credentials/);
  });

  it('login succeeds with verified bcrypt password and returns token without password field', async () => {
    const req = {
      body: {
        email: 'owner@fusioncoffee.in',
        password: 'password123',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await login(req, res, () => {});
    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.ok(responseBody.token);
    assert.equal(responseBody.user.email, 'owner@fusioncoffee.in');
    assert.equal(responseBody.user.password, undefined);
  });

  it('blocks public unauthenticated registration', async () => {
    const req = {
      user: null, // Unauthenticated public request
      body: {
        name: 'Attacker Hacker',
        email: 'hacker@malicious.com',
        password: 'password123',
        role: 'Owner',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await register(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /Public self-registration is disabled/);
  });

  it('blocks Manager from escalating privileges to create Owner or Manager', async () => {
    const req = {
      user: { id: 'usr-2', name: 'Nikhil Rao', role: 'Manager' },
      body: {
        name: 'Sneaky User',
        email: 'sneaky@fusioncoffee.in',
        password: 'password123',
        role: 'Owner',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await register(req, res, () => {});
    assert.equal(statusCode, 403);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /Only an Owner can create 'Owner' accounts/);
  });

  it('allows Owner to register new staff with sanitized response', async () => {
    const req = {
      user: { id: 'usr-1', name: 'Kavita Menon', role: 'Owner' },
      body: {
        name: 'New Barista Person',
        email: 'newbarista@fusioncoffee.in',
        password: 'password123',
        role: 'Barista',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await register(req, res, () => {});
    assert.equal(statusCode, 201);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.user.role, 'Barista');
    assert.equal(responseBody.user.password, undefined);
  });
});

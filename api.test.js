const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

describe('HTTP API Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
  });

  test('POST /api/signup returns 422 with named errors when payload is incomplete', async () => {
    const res = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulate-Delay': '0'
      },
      body: JSON.stringify({ fullName: 'A' })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.errors.fullName);
    assert.match(body.errors.fullName, /^Full Name:/);
    assert.ok(body.errors.email);
    assert.match(body.errors.email, /^Work Email:/);
  });

  test('POST /api/signup returns 409 Conflict when email is already registered', async () => {
    const res = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulate-Delay': '0'
      },
      body: JSON.stringify({
        fullName: 'Registered User',
        email: 'taken@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        workspaceName: 'Acme Cloud',
        role: 'developer',
        teamSize: '2-10',
        terms: true
      })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.errors.email, /already registered/i);
    assert.match(body.errors.email, /sign in or use another email/i);
  });

  test('POST /api/signup returns 201 Created and user record on valid data', async () => {
    const res = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulate-Delay': '0'
      },
      body: JSON.stringify({
        fullName: 'Maya Lin',
        email: 'maya.lin@flowcraft.io',
        password: 'ValidPassword123$',
        confirmPassword: 'ValidPassword123$',
        workspaceName: 'Studio Hex',
        role: 'designer',
        teamSize: 'solo',
        terms: true,
        notifyUpdates: true
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.fullName, 'Maya Lin');
    assert.equal(body.user.email, 'maya.lin@flowcraft.io');
    assert.equal(body.user.workspaceName, 'Studio Hex');
    assert.equal(body.user.role, 'designer');
    assert.ok(body.user.id.startsWith('usr_'));
  });
});

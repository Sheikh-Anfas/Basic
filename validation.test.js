const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateSignupData, TAKEN_EMAILS } = require('../server/validator.js');

describe('Server Validation Engine', () => {
  const validPayload = {
    fullName: 'Jane Developer',
    email: 'jane.dev@example.io',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    workspaceName: 'Acme Cloud',
    role: 'developer',
    teamSize: '2-10',
    terms: true,
    notifications: {
      productUpdates: true,
      securityAlerts: true
    }
  };

  test('accepts completely valid payload', () => {
    const result = validateSignupData(validPayload);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.sanitized.fullName, 'Jane Developer');
    assert.equal(result.sanitized.email, 'jane.dev@example.io');
  });

  test('validates Full Name correctly with field name and suggested fix', () => {
    // Missing name
    let res = validateSignupData({ ...validPayload, fullName: '' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.fullName, /^Full Name:/);
    assert.match(res.errors.fullName, /at least 2 characters/i);

    // Too short name
    res = validateSignupData({ ...validPayload, fullName: 'A' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.fullName, /^Full Name: Name is too short/);
  });

  test('validates Work Email correctly and rejects invalid formats', () => {
    const invalidEmails = ['invalid', 'plainaddress', '@missingusername.com', 'user@domain'];
    for (const email of invalidEmails) {
      const res = validateSignupData({ ...validPayload, email });
      assert.equal(res.isValid, false, `Expected ${email} to fail validation`);
      assert.match(res.errors.email, /^Work Email:/);
      assert.match(res.errors.email, /valid email address/i);
    }
  });

  test('rejects registered emails to simulate conflict and preserve state', () => {
    for (const email of TAKEN_EMAILS) {
      const res = validateSignupData({ ...validPayload, email });
      assert.equal(res.isValid, false);
      assert.match(res.errors.email, /^Work Email: This email address is already registered/);
      assert.match(res.errors.email, /Please sign in or use another email/);
    }
  });

  test('validates password complexity rules with descriptive missing requirements', () => {
    // Missing special character
    let res = validateSignupData({ ...validPayload, password: 'Password123', confirmPassword: 'Password123' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.password, /^Password: Please add/);
    assert.match(res.errors.password, /special character/);

    // Too short
    res = validateSignupData({ ...validPayload, password: 'Pass1!', confirmPassword: 'Pass1!' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.password, /8\+ characters/);
  });

  test('validates password matching on confirm password', () => {
    const res = validateSignupData({ ...validPayload, confirmPassword: 'DifferentPassword123!' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.confirmPassword, /^Confirm Password:/);
    assert.match(res.errors.confirmPassword, /Passwords do not match/);
  });

  test('validates workspace name', () => {
    const res = validateSignupData({ ...validPayload, workspaceName: ' ' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.workspaceName, /^Workspace Name:/);
  });

  test('validates role and team size', () => {
    let res = validateSignupData({ ...validPayload, role: 'invalid-role' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.role, /^Primary Role:/);

    res = validateSignupData({ ...validPayload, teamSize: 'invalid-size' });
    assert.equal(res.isValid, false);
    assert.match(res.errors.teamSize, /^Team Size:/);
  });

  test('validates terms and conditions acceptance', () => {
    const res = validateSignupData({ ...validPayload, terms: false });
    assert.equal(res.isValid, false);
    assert.match(res.errors.terms, /^Terms of Service:/);
  });
});

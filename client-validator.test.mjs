import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateField, evaluatePasswordStrength } from '../public/js/validator.js';

describe('Client Validation Engine', () => {
  test('Full Name validation: names field and suggests fix', () => {
    assert.equal(validateField('fullName', ''), 'Full Name: Please enter your full name (at least 2 characters).');
    assert.equal(validateField('fullName', 'A'), 'Full Name: Name is too short. Please enter at least 2 characters.');
    assert.equal(validateField('fullName', 'Alex Morgan'), null);
  });

  test('Work Email validation: names field and suggests fix', () => {
    assert.equal(validateField('email', ''), 'Work Email: Please enter your email address.');
    assert.equal(validateField('email', 'notanemail'), 'Work Email: Please enter a valid email address with a domain (e.g., alex@company.com).');
    assert.equal(validateField('email', 'taken@example.com'), 'Work Email: This email address is already registered. Please sign in or use another email.');
    assert.equal(validateField('email', 'valid.user@company.io'), null);
  });

  test('Password complexity: names field and suggests fix', () => {
    assert.equal(validateField('password', ''), 'Password: Please create a password (minimum 8 characters).');
    const weakErr = validateField('password', 'password');
    assert.match(weakErr, /^Password: Please add/);
    assert.match(weakErr, /uppercase letter/);
    assert.match(weakErr, /special character/);

    assert.equal(validateField('password', 'StrongPass123!'), null);
  });

  test('Confirm Password: names field and suggests fix', () => {
    assert.equal(validateField('confirmPassword', '', { password: 'StrongPass123!' }), 'Confirm Password: Please re-type your password to confirm it.');
    assert.equal(validateField('confirmPassword', 'Mismatch123!', { password: 'StrongPass123!' }), 'Confirm Password: Passwords do not match. Please re-enter the exact same password.');
    assert.equal(validateField('confirmPassword', 'StrongPass123!', { password: 'StrongPass123!' }), null);
  });

  test('Workspace Name: names field and suggests fix', () => {
    assert.equal(validateField('workspaceName', ''), 'Workspace Name: Please enter a name for your team or workspace (e.g., Acme Labs).');
    assert.equal(validateField('workspaceName', 'A'), 'Workspace Name: Name must be at least 2 characters long. Please enter a descriptive workspace name.');
    assert.equal(validateField('workspaceName', 'Acme Studios'), null);
  });

  test('Role: names field and suggests fix', () => {
    assert.equal(validateField('role', ''), 'Primary Role: Please select the role that best describes your work.');
    assert.equal(validateField('role', 'developer'), null);
    assert.equal(validateField('role', 'founder'), null);
  });

  test('Team Size: names field and suggests fix', () => {
    assert.equal(validateField('teamSize', ''), 'Team Size: Please select your current team or company size from the dropdown.');
    assert.equal(validateField('teamSize', '2-10'), null);
  });

  test('Terms: names field and suggests fix', () => {
    assert.equal(validateField('terms', false), 'Terms of Service: You must check the box to agree to the Terms of Service and Privacy Policy.');
    assert.equal(validateField('terms', true), null);
  });

  test('evaluatePasswordStrength computes score and checklist accurately', () => {
    const emptyRes = evaluatePasswordStrength('');
    assert.equal(emptyRes.score, 0);

    const weakRes = evaluatePasswordStrength('short');
    assert.equal(weakRes.score, 1);
    assert.equal(weakRes.checks.length, false);

    const strongRes = evaluatePasswordStrength('SuperSecret123#');
    assert.equal(strongRes.score, 4);
    assert.equal(strongRes.checks.length, true);
    assert.equal(strongRes.checks.upper, true);
    assert.equal(strongRes.checks.lower, true);
    assert.equal(strongRes.checks.number, true);
    assert.equal(strongRes.checks.special, true);
  });
});

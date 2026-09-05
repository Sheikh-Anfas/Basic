/**
 * Server-side validation logic for Signup Form.
 * Rule: "Server MUST revalidate — don't trust the client."
 * Rule: "Every error message must name the field and suggest the fix."
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Simulated list of already registered emails to demonstrate 409 conflict
// and data preservation on server-side rejection.
const TAKEN_EMAILS = new Set([
  'taken@example.com',
  'admin@example.com',
  'john.doe@acme.com',
  'existing@company.com'
]);

/**
 * Validates signup payload and returns an errors object mapping field names to actionable error strings.
 * @param {Object} data 
 * @returns {{ isValid: boolean, errors: Record<string, string>, sanitized: Object }}
 */
function validateSignupData(data = {}) {
  const errors = {};
  const sanitized = {};

  // 1. Full Name
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  sanitized.fullName = fullName;
  if (!fullName) {
    errors.fullName = 'Full Name: Please enter your full name (at least 2 characters).';
  } else if (fullName.length < 2) {
    errors.fullName = 'Full Name: Name is too short. Please enter at least 2 characters.';
  } else if (fullName.length > 100) {
    errors.fullName = 'Full Name: Name cannot exceed 100 characters. Please shorten your name.';
  }

  // 2. Email Address
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  sanitized.email = email;
  if (!email) {
    errors.email = 'Work Email: Please enter your email address.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Work Email: Please enter a valid email address with a domain (e.g., name@company.com).';
  } else if (TAKEN_EMAILS.has(email)) {
    errors.email = 'Work Email: This email address is already registered. Please sign in or use another email.';
  }

  // 3. Password
  const password = typeof data.password === 'string' ? data.password : '';
  if (!password) {
    errors.password = 'Password: Please create a password (minimum 8 characters).';
  } else {
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      const missing = [];
      if (!hasMinLen) missing.push('8+ characters');
      if (!hasUpper) missing.push('an uppercase letter');
      if (!hasLower) missing.push('a lowercase letter');
      if (!hasNumber) missing.push('a number');
      if (!hasSpecial) missing.push('a special character (!@#$%^&*)');

      errors.password = `Password: Please add ${missing.join(', ')} to meet security requirements.`;
    }
  }

  // 4. Confirm Password
  const confirmPassword = typeof data.confirmPassword === 'string' ? data.confirmPassword : '';
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm Password: Please re-type your password to confirm it.';
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'Confirm Password: Passwords do not match. Please re-enter the exact same password.';
  }

  // 5. Workspace Name
  const workspaceName = typeof data.workspaceName === 'string' ? data.workspaceName.trim() : '';
  sanitized.workspaceName = workspaceName;
  if (!workspaceName) {
    errors.workspaceName = 'Workspace Name: Please enter a name for your team or workspace (e.g., Acme Labs).';
  } else if (workspaceName.length < 2) {
    errors.workspaceName = 'Workspace Name: Name must be at least 2 characters long. Please enter a descriptive workspace name.';
  }

  // 6. Role Selection
  const validRoles = ['developer', 'designer', 'product', 'founder', 'student', 'other'];
  const role = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';
  sanitized.role = role;
  if (!role || !validRoles.includes(role)) {
    errors.role = 'Primary Role: Please select one of the available roles (Developer, Designer, Product, Founder, Student, or Other).';
  }

  // 7. Team Size
  const validTeamSizes = ['solo', '2-10', '11-50', '50+'];
  const teamSize = typeof data.teamSize === 'string' ? data.teamSize.trim() : '';
  sanitized.teamSize = teamSize;
  if (!teamSize || !validTeamSizes.includes(teamSize)) {
    errors.teamSize = 'Team Size: Please select your current team or company size from the dropdown.';
  }

  // 8. Terms Acceptance
  const terms = data.terms === true || data.terms === 'true' || data.terms === 'on';
  sanitized.terms = terms;
  if (!terms) {
    errors.terms = 'Terms of Service: You must check the box to agree to the Terms of Service and Privacy Policy.';
  }

  // Optional preferences
  sanitized.notifications = {
    productUpdates: Boolean(data.notifications?.productUpdates ?? data.notifyUpdates),
    securityAlerts: Boolean(data.notifications?.securityAlerts ?? data.notifySecurity ?? true)
  };

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  validateSignupData,
  TAKEN_EMAILS,
  EMAIL_REGEX
};

const express = require('express');
const path = require('path');
const { validateSignupData, TAKEN_EMAILS } = require('./server/validator.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint to simulate checking email availability
app.get('/api/check-email', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Work Email: Email query parameter is required.' });
  }

  const isTaken = TAKEN_EMAILS.has(email);
  return res.json({
    email,
    available: !isTaken,
    message: isTaken
      ? 'Work Email: This email address is already registered. Please sign in or use another email.'
      : 'Work Email: Available.'
  });
});

// Primary Signup Endpoint
app.post('/api/signup', async (req, res) => {
  // Artificial network delay to demonstrate disabled in-flight button state & loading spinner
  const delayMs = req.headers['x-simulate-delay']
    ? parseInt(req.headers['x-simulate-delay'], 10)
    : 750;

  await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));

  const { isValid, errors, sanitized } = validateSignupData(req.body);

  if (!isValid) {
    const isEmailConflict = errors.email && errors.email.includes('already registered');
    const statusCode = isEmailConflict ? 409 : 422;

    return res.status(statusCode).json({
      success: false,
      message: isEmailConflict
        ? 'A registered account already uses this email. Please check your credentials.'
        : 'Please review the form. Some required details need your attention.',
      errors
    });
  }

  // Success response
  const accountId = 'usr_' + Math.random().toString(36).substring(2, 10);
  return res.status(201).json({
    success: true,
    message: 'Welcome aboard! Your workspace has been created.',
    user: {
      id: accountId,
      fullName: sanitized.fullName,
      email: sanitized.email,
      workspaceName: sanitized.workspaceName,
      role: sanitized.role,
      teamSize: sanitized.teamSize,
      notifications: sanitized.notifications,
      createdAt: new Date().toISOString()
    }
  });
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Signup server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

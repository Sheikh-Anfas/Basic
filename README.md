# A Signup Form That Doesn't Suck

> A battle-tested, high-craft multi-step signup form engineered around real user psychology: blur-based validation, actionable error copy, draft persistence across reloads, bulletproof server-side revalidation, accessible ARIA announcements, and complete form preservation on failure.

---

## Live Demo & Quickstart

- **Local Live URL**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/api/health`
- **Tech Stack**: Semantic HTML5, Vanilla Modern CSS, ES6 Modules, Node.js + Express.js, `localStorage` API, WCAG 2.1 AA/AAA compliant patterns.

### Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run the test suite (unit, client, and HTTP API integration tests)
npm test

# 3. Start the server
npm start
# Server will be live at http://localhost:3000
```

---

## The Philosophy: Why Most Signup Forms Suck

The signup form is the single most critical inflection point in any product. Every micro-friction point, premature red banner, or lost field value costs you users. 

This implementation adheres to three non-negotiable rules:
1. **Every error message must name the field and suggest the fix.**
2. **Server MUST revalidate — never trust the client.**
3. **Refreshing the page mid-flow must never wipe the user's data.**

---

## Validation Decisions & Rationale

### 1. Blur Validation over Eager/Inline Validation
* **The Problem with Instant Validation on Typing**: Showing red error borders while a user has typed only 3 characters of their email address feels aggressive and punishing. It creates premature anxiety and breaks typing rhythm.
* **Our Decision**: Fields are evaluated only on **`blur`** (when focus leaves the field) or when the user attempts to proceed to the next step / submit.
* **The "Easing" Rule (Instant Recovery)**: Once a field has been touched and entered an error state, subsequent `input` keystrokes re-evaluate the field in real time. The moment the criteria are met, the error disappears immediately. This gives instant positive reinforcement without any premature friction.

### 2. "Name the Field and Suggest the Fix"
Generic error messages like *"Invalid format"*, *"Field required"*, or *"Weak password"* force the user to guess what went wrong.

Every error in this system follows the pattern:  
`[Field Name]: [Specific, actionable fix]`

| Field | Bad / Generic Error | Our Actionable Error |
| :--- | :--- | :--- |
| **Full Name** | *"Invalid name"* | **`Full Name: Please enter your full name (at least 2 characters).`** |
| **Work Email** | *"Invalid email address"* | **`Work Email: Please enter a valid email address with a domain (e.g., alex@company.com).`** |
| **Work Email (Taken)**| *"User exists"* | **`Work Email: This email address is already registered. Please sign in or use another email.`** |
| **Password** | *"Password too weak"* | **`Password: Please add 8+ characters, an uppercase letter, and a special character to meet security requirements.`** |
| **Confirm Password** | *"Does not match"* | **`Confirm Password: Passwords do not match. Please re-enter the exact same password.`** |
| **Workspace Name** | *"Required"* | **`Workspace Name: Please enter a name for your team or workspace (e.g., Acme Labs).`** |
| **Primary Role** | *"Selection required"* | **`Primary Role: Please select the role that best describes your work.`** |
| **Terms & Conditions**| *"Must agree"* | **`Terms of Service: You must check the box to agree to the Terms of Service and Privacy Policy.`** |

### 3. Server Revalidation (Defense-in-Depth)
Client-side validation is solely an **interaction convenience**, not a security barrier.
* Anyone can disable JavaScript, edit the DOM, craft a custom `curl` POST, or replay network packets.
* The Express server (`POST /api/signup`) runs through identical or stricter validation checks.
* Simulated real-world checks (such as conflicting emails: `taken@example.com`, `admin@example.com`) return `409 Conflict` with exact field error mappings.

### 4. Preservation on Server Rejection
* **The Ultimate Form Cardinal Sin**: Submitting a form, receiving a server error (e.g., duplicate email or expired CSRF token), and having the form reload blank.
* **Our Implementation**:
  - The form is submitted asynchronously via `fetch`.
  - On error (409 or 422), all form input values remain 100% intact.
  - The application parses the returned `errors` map, displays the top alert banner, highlights the offending inputs, automatically navigates back to the earliest step with an issue, and sets focus directly on that field.

### 5. Persistent Drafts across Refreshes (`localStorage`)
* Mobile browsers frequently reload tabs when users switch to password managers, authenticators, or email clients.
* On every keystroke/change, the form state (all fields + current step index) is debounced (300ms) and written to `localStorage` under `signup_form_draft_v1`.
* When the user reloads or returns, the state is seamlessly restored, the active step is restored, and a discreet top indicator displays: `"Draft restored (saved at HH:MM:SS)"`.
* Once registration succeeds, the draft is cleanly purged. Users can also manually reset via the `"Reset Draft"` button.

### 6. In-Flight State & Double-Submit Protection
* When the user submits, the submit button is disabled, enters an in-flight spinning state, and sets `aria-busy="true"`.
* All navigation controls and inputs are guarded to prevent double-submits, duplicate account creation, and network race conditions.
* The backend includes configurable simulated latency (`X-Simulate-Delay`) to test and demonstrate this state reliably.

### 7. Friendly Success State
* Upon receiving a `201 Created` response, the form card smoothly transitions to an accessible success screen.
* Shows a celebratory animated checkmark, a personalized welcome message (`Welcome aboard, [Name]!`), and a confirmed summary card with generated Account ID, workspace details, and selected track.

---

## Accessibility (A11y) & WCAG Compliance

- **Programmatic ARIA Sync**: Inputs dynamically set `aria-invalid="true"` and are tied via `aria-describedby` to their respective hints and error blocks (`role="alert"` / `aria-live="polite"`).
- **Global Announcer**: An offscreen live region (`#status-announcer` with `aria-live="polite"`) speaks step transitions and status updates to assistive technology.
- **Focus Management**:
  - Advancing steps moves focus to the step's heading (`h1`/`h2`).
  - Validation failures auto-focus the first invalid field.
  - Success transitions auto-focus the success container.
- **Accessible Progress Tracker**: Structured as a `<nav aria-label="Signup Steps"><ol>` with `aria-current="step"`.
- **Accessible Password Masking**: Toggle button provides explicit `aria-label` ("Show password" / "Hide password") and toggles `aria-pressed="true|false"`.
- **Keyboard Navigation**:
  - Single-line inputs trigger step progression or submission on `Enter`.
  - `Escape` dismisses the global alert banner.
  - Focus rings are styled with high-contrast outlines (`:focus-visible`).

---

## Project Structure

```
.
├── server.js                     # Express HTTP server & API endpoints
├── server/
│   └── validator.js              # Server validation engine & taken email checks
├── public/
│   ├── index.html                # Semantic, accessible multi-step form & success UI
│   ├── css/
│   │   └── styles.css            # Dark mode design system & micro-interactions
│   └── js/
│       ├── app.js                # Frontend controller, step machine & event handling
│       ├── validator.js          # Client-side validation & password strength evaluator
│       ├── draft-storage.js      # LocalStorage debounced persistence engine
│       └── package.json          # ES Module config for browser scripts
├── tests/
│   ├── api.test.js               # Integration tests for Express endpoints (201, 409, 422)
│   ├── client-validator.test.mjs # Unit tests for client validation & password rules
│   └── validation.test.js        # Unit tests for server validation engine
├── package.json
├── .gitignore
└── README.md
```

---

## Test Coverage

Run all automated unit and integration tests:

```bash
npm test
```

Test breakdown:
- **`tests/validation.test.js`**: 9 unit tests for server-side rules (name, email regex, taken email conflict, password complexity, password match, workspace, role, terms).
- **`tests/client-validator.test.mjs`**: 9 unit tests for client-side validator and password score checklist.
- **`tests/api.test.js`**: 4 integration tests verifying health checks, 422 incomplete payloads, 409 duplicate email rejection, and 201 successful creation.
- **Total**: 22 automated tests passing with 0 failures.

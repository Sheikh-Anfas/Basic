import { validateField, evaluatePasswordStrength } from './validator.js';
import { DraftStorage } from './draft-storage.js';

/**
 * Main Signup Application Controller.
 * Ensures every interaction feels responsive, robust, and accessible.
 */
class SignupApp {
  constructor() {
    // Current step tracking
    this.currentStep = 1;
    this.totalSteps = 3;
    this.touchedFields = new Set();
    this.isSubmitting = false;

    // Cache DOM Elements
    this.form = document.getElementById('signup-form');
    this.formCard = document.getElementById('form-card');
    this.successScreen = document.getElementById('success-screen');
    this.announcer = document.getElementById('status-announcer');
    this.globalAlert = document.getElementById('global-alert');
    this.globalAlertMsg = document.getElementById('global-alert-message');
    this.btnCloseAlert = document.getElementById('btn-close-alert');

    // Navigation buttons
    this.btnBack = document.getElementById('btn-back');
    this.btnNext = document.getElementById('btn-next');
    this.btnSubmit = document.getElementById('btn-submit');
    this.btnClearDraft = document.getElementById('btn-clear-draft');
    this.draftStatusText = document.getElementById('draft-status-text');

    // Password toggles & meter
    this.togglePasswordBtn = document.getElementById('toggle-password');
    this.toggleConfirmBtn = document.getElementById('toggle-confirm-password');
    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');
    this.meterFill = document.getElementById('meter-fill');
    this.meterLabel = document.getElementById('meter-label');

    // Step step fields mapping
    this.stepFields = {
      1: ['fullName', 'email', 'password', 'confirmPassword'],
      2: ['workspaceName', 'role', 'teamSize'],
      3: ['terms']
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.restoreSavedDraft();
  }

  /**
   * Attach all interaction and event listeners.
   */
  setupEventListeners() {
    // 1. Blur Validation (Event Delegation on Form)
    this.form.addEventListener('blur', (e) => this.handleFieldBlur(e), true);

    // 2. Input / Change Events (Live Recovery & Draft Auto-Saving)
    this.form.addEventListener('input', (e) => this.handleFieldInput(e));
    this.form.addEventListener('change', (e) => this.handleFieldChange(e));

    // 3. Navigation Controls
    this.btnNext.addEventListener('click', () => this.handleNextStep());
    this.btnBack.addEventListener('click', () => this.handlePrevStep());
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // 4. Enter key navigation inside inputs
    this.form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"])')) {
        e.preventDefault();
        if (this.currentStep < this.totalSteps) {
          this.handleNextStep();
        } else {
          this.form.requestSubmit();
        }
      }
    });

    // 5. Password Visibility Toggles
    this.togglePasswordBtn.addEventListener('click', () => {
      this.togglePasswordVisibility(this.passwordInput, this.togglePasswordBtn);
    });

    if (this.toggleConfirmBtn) {
      this.toggleConfirmBtn.addEventListener('click', () => {
        this.togglePasswordVisibility(this.confirmPasswordInput, this.toggleConfirmBtn);
      });
    }

    // 6. Review Summary Step Jump Buttons
    document.querySelectorAll('.btn-jump-step').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetStep = parseInt(e.currentTarget.dataset.targetStep, 10);
        if (targetStep >= 1 && targetStep <= this.totalSteps) {
          this.goToStep(targetStep);
        }
      });
    });

    // 7. Draft Reset Button
    this.btnClearDraft.addEventListener('click', () => this.resetFormAndDraft());

    // 8. Global Alert Dismissal
    this.btnCloseAlert.addEventListener('click', () => this.hideGlobalAlert());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.globalAlert.hidden) {
        this.hideGlobalAlert();
      }
    });

    // 9. Success Screen Actions
    document.getElementById('btn-create-another')?.addEventListener('click', () => {
      this.resetFormAndDraft();
      this.successScreen.hidden = true;
      this.formCard.hidden = false;
      this.goToStep(1);
    });

    document.getElementById('btn-demo-dashboard')?.addEventListener('click', () => {
      alert('Welcome to your demo FlowCraft dashboard! All registration workflows passed.');
    });
  }

  /**
   * Handle blur event for an input field: validates and displays error if touched.
   */
  handleFieldBlur(e) {
    const field = e.target;
    if (!field.name || field.type === 'hidden') return;

    this.touchedFields.add(field.name);
    this.validateAndRenderField(field.name);
  }

  /**
   * Handle input event: auto-saves draft and clears errors immediately if previously invalid.
   */
  handleFieldInput(e) {
    const field = e.target;
    if (!field.name) return;

    // Real-time password strength meter and checklist
    if (field.name === 'password') {
      this.updatePasswordMeter(field.value);
      if (this.touchedFields.has('confirmPassword')) {
        this.validateAndRenderField('confirmPassword');
      }
    }

    // If field was already touched and had an error, re-evaluate to clear error immediately
    if (this.touchedFields.has(field.name)) {
      this.validateAndRenderField(field.name);
    }

    // Save draft
    this.persistDraft();
  }

  /**
   * Handle change event (for selects and radios).
   */
  handleFieldChange(e) {
    const field = e.target;
    if (!field.name) return;

    this.touchedFields.add(field.name);
    this.validateAndRenderField(field.name);
    this.persistDraft();
  }

  /**
   * Validates a single field, updates UI, and synchronizes ARIA attributes.
   * @param {string} fieldName 
   * @returns {boolean} true if valid
   */
  validateAndRenderField(fieldName) {
    const values = this.getFormData();
    const error = validateField(fieldName, values[fieldName], values);
    const errorEl = document.getElementById(`${fieldName}-error`);
    const groupEl = document.getElementById(`group-${fieldName}`);
    const inputEl = this.form.elements[fieldName];

    const inputNode = inputEl instanceof RadioNodeList ? inputEl[0] : inputEl;

    if (error) {
      if (errorEl) {
        errorEl.textContent = error;
      }
      if (groupEl) {
        groupEl.classList.add('has-error');
      }
      if (inputNode && inputNode.setAttribute) {
        inputNode.setAttribute('aria-invalid', 'true');
      }
      return false;
    } else {
      if (errorEl) {
        errorEl.textContent = '';
      }
      if (groupEl) {
        groupEl.classList.remove('has-error');
      }
      if (inputNode && inputNode.removeAttribute) {
        inputNode.removeAttribute('aria-invalid');
      }
      return true;
    }
  }

  /**
   * Validates all fields in the specified step.
   * If invalid, focuses the first offending field.
   * @param {number} stepNumber 
   * @returns {boolean}
   */
  validateStep(stepNumber) {
    const fields = this.stepFields[stepNumber] || [];
    let isAllValid = true;
    let firstInvalidField = null;

    for (const fieldName of fields) {
      this.touchedFields.add(fieldName);
      const isValid = this.validateAndRenderField(fieldName);
      if (!isValid) {
        isAllValid = false;
        if (!firstInvalidField) {
          firstInvalidField = fieldName;
        }
      }
    }

    if (!isAllValid && firstInvalidField) {
      const el = this.form.elements[firstInvalidField];
      const targetFocus = el instanceof RadioNodeList ? el[0] : el;
      if (targetFocus && typeof targetFocus.focus === 'function') {
        targetFocus.focus();
      }
      this.announceMessage(`Please fix the errors in step ${stepNumber}.`);
    }

    return isAllValid;
  }

  /**
   * Advances to next step if current step is valid.
   */
  handleNextStep() {
    const isValid = this.validateStep(this.currentStep);
    if (!isValid) return;

    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  /**
   * Returns to previous step.
   */
  handlePrevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  /**
   * Switches to a specific step index, updates tracker, buttons, and accessibility.
   * @param {number} newStep 
   */
  goToStep(newStep) {
    this.currentStep = newStep;

    // Toggle panels
    for (let i = 1; i <= this.totalSteps; i++) {
      const panel = document.getElementById(`step-panel-${i}`);
      const navItem = document.getElementById(`step-nav-${i}`);
      const divider = navItem?.previousElementSibling?.classList.contains('step-divider')
        ? navItem.previousElementSibling
        : null;

      if (i === newStep) {
        panel.hidden = false;
        panel.classList.add('active');
        navItem.setAttribute('aria-current', 'step');
        navItem.classList.remove('completed');
      } else if (i < newStep) {
        panel.hidden = true;
        panel.classList.remove('active');
        navItem.removeAttribute('aria-current');
        navItem.classList.add('completed');
        if (divider) divider.classList.add('completed');
      } else {
        panel.hidden = true;
        panel.classList.remove('active');
        navItem.removeAttribute('aria-current');
        navItem.classList.remove('completed');
        if (divider) divider.classList.remove('completed');
      }
    }

    // Update bottom action buttons
    if (this.currentStep === 1) {
      this.btnBack.style.visibility = 'hidden';
      this.btnNext.hidden = false;
      this.btnSubmit.hidden = true;
    } else if (this.currentStep === this.totalSteps) {
      this.btnBack.style.visibility = 'visible';
      this.btnNext.hidden = true;
      this.btnSubmit.hidden = false;
      this.updateReviewSummary();
    } else {
      this.btnBack.style.visibility = 'visible';
      this.btnNext.hidden = false;
      this.btnSubmit.hidden = true;
    }

    // Move focus to step heading for accessible navigation
    const heading = document.getElementById(`step-${newStep}-heading`);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }

    this.announceMessage(`Step ${this.currentStep} of ${this.totalSteps}: ${heading?.textContent || ''}`);
    this.persistDraft();
  }

  /**
   * Populates Review Card in Step 3.
   */
  updateReviewSummary() {
    const data = this.getFormData();

    document.getElementById('rev-name').textContent = data.fullName || '(Not provided)';
    document.getElementById('rev-email').textContent = data.email || '(Not provided)';
    document.getElementById('rev-workspace').textContent = data.workspaceName || '(Not provided)';

    const roleName = data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Not selected';
    const teamSize = data.teamSize ? ` (${data.teamSize})` : '';
    document.getElementById('rev-role').textContent = `${roleName}${teamSize}`;
  }

  /**
   * Toggles password mask / unmask state.
   */
  togglePasswordVisibility(inputEl, buttonEl) {
    const isPassword = inputEl.getAttribute('type') === 'password';
    inputEl.setAttribute('type', isPassword ? 'text' : 'password');
    buttonEl.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    buttonEl.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  }

  /**
   * Computes and updates password strength visual meter and checklist.
   */
  updatePasswordMeter(password) {
    const { score, label, checks } = evaluatePasswordStrength(password);

    // Update checklist
    const rules = [
      { id: 'rule-len', valid: checks.length },
      { id: 'rule-upper', valid: checks.upper },
      { id: 'rule-lower', valid: checks.lower },
      { id: 'rule-num', valid: checks.number },
      { id: 'rule-sym', valid: checks.special }
    ];

    rules.forEach((rule) => {
      const el = document.getElementById(rule.id);
      if (el) {
        el.classList.toggle('valid', rule.valid);
      }
    });

    // Color & width transitions
    const percentage = score * 25;
    this.meterFill.style.width = `${percentage}%`;

    const colors = {
      0: '#64748b',
      1: '#f43f5e',
      2: '#f59e0b',
      3: '#3b82f6',
      4: '#10b981'
    };

    this.meterFill.style.backgroundColor = colors[score] || '#64748b';
    this.meterLabel.textContent = password ? label : 'Requirements';
    this.meterLabel.style.color = colors[score] || 'var(--text-muted)';
  }

  /**
   * Extracts current form values into a clean dictionary.
   */
  getFormData() {
    const formData = new FormData(this.form);
    const data = {};

    for (const [key, val] of formData.entries()) {
      data[key] = val;
    }

    // Explicitly grab checkboxes
    data.terms = this.form.elements['terms']?.checked || false;
    data.notifyUpdates = this.form.elements['notifyUpdates']?.checked ?? true;
    data.notifySecurity = this.form.elements['notifySecurity']?.checked ?? true;

    return data;
  }

  /**
   * Persists draft to localStorage with debounced save and visual feedback.
   */
  persistDraft() {
    const data = this.getFormData();
    DraftStorage.saveDraft(data, this.currentStep, (savedAt) => {
      const formatted = DraftStorage.formatSavedTime(savedAt);
      this.draftStatusText.textContent = `Draft saved at ${formatted}`;
    });
  }

  /**
   * Restores draft data from localStorage.
   * Rule: "Refreshing the page mid-flow must not wipe the user's data."
   */
  restoreSavedDraft() {
    const draft = DraftStorage.loadDraft();
    if (!draft || !draft.data) return;

    const { data, step, savedAt } = draft;

    // Populate input values
    Object.entries(data).forEach(([key, val]) => {
      const field = this.form.elements[key];
      if (!field) return;

      if (field instanceof RadioNodeList) {
        for (const radio of field) {
          if (radio.value === val) {
            radio.checked = true;
            break;
          }
        }
      } else if (field.type === 'checkbox') {
        field.checked = Boolean(val);
      } else {
        field.value = val;
      }
    });

    // Recompute password meter if password was restored
    if (data.password) {
      this.updatePasswordMeter(data.password);
    }

    // Restore step (default to 1 if missing)
    const targetStep = step && step >= 1 && step <= this.totalSteps ? step : 1;
    this.goToStep(targetStep);

    // Update draft indicator
    const formatted = DraftStorage.formatSavedTime(savedAt);
    this.draftStatusText.textContent = `Draft restored (${formatted})`;
  }

  /**
   * Clears saved draft and resets form.
   */
  resetFormAndDraft() {
    DraftStorage.clearDraft();
    this.form.reset();
    this.touchedFields.clear();

    // Clear all error states
    document.querySelectorAll('.form-group.has-error').forEach((el) => el.classList.remove('has-error'));
    document.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
    document.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));

    this.updatePasswordMeter('');
    this.hideGlobalAlert();
    this.draftStatusText.textContent = 'Draft cleared';
    this.goToStep(1);
  }

  /**
   * Handles form submission: validates all steps, manages in-flight state, sends payload to server.
   * Rule: "preserved fields on failure", "disabled submit while in flight".
   */
  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    this.hideGlobalAlert();

    // Revalidate ALL steps before transmitting
    let allValid = true;
    for (let step = 1; step <= this.totalSteps; step++) {
      if (!this.validateStep(step)) {
        allValid = false;
        this.goToStep(step);
        break;
      }
    }

    if (!allValid) return;

    // Enter in-flight submission state
    this.setInFlight(true);

    try {
      const payload = this.getFormData();
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // SERVER REJECTED: Handle errors while strictly PRESERVING all input fields!
        this.handleServerErrors(result);
        return;
      }

      // SUCCESS!
      this.handleSuccess(result);
    } catch (networkError) {
      console.error('Submission network error:', networkError);
      this.showGlobalAlert('Network error: Unable to connect to the server. Your data has been preserved. Please try again.');
      this.announceMessage('Network error. Your inputs are preserved. Please try submitting again.');
    } finally {
      this.setInFlight(false);
    }
  }

  /**
   * Handles server validation rejection (e.g. 409 duplicate email or 422 input error).
   * All form fields stay 100% intact. Offending field is highlighted and focused.
   */
  handleServerErrors(response) {
    const errors = response.errors || {};
    const message = response.message || 'Validation failed on the server. Please correct the highlighted errors.';

    this.showGlobalAlert(message);
    this.announceMessage(`Submission failed: ${message}`);

    let firstErrorStep = null;
    let firstErrorField = null;

    // Apply errors to fields
    Object.entries(errors).forEach(([fieldName, errorText]) => {
      const errorEl = document.getElementById(`${fieldName}-error`);
      const groupEl = document.getElementById(`group-${fieldName}`);
      const inputEl = this.form.elements[fieldName];

      if (errorEl) errorEl.textContent = errorText;
      if (groupEl) groupEl.classList.add('has-error');

      const inputNode = inputEl instanceof RadioNodeList ? inputEl[0] : inputEl;
      if (inputNode && inputNode.setAttribute) {
        inputNode.setAttribute('aria-invalid', 'true');
      }

      // Determine which step this field belongs to
      for (let step = 1; step <= this.totalSteps; step++) {
        if (this.stepFields[step].includes(fieldName)) {
          if (!firstErrorStep || step < firstErrorStep) {
            firstErrorStep = step;
            firstErrorField = fieldName;
          }
          break;
        }
      }
    });

    // Jump user to the earliest step with an error and focus the field
    if (firstErrorStep && firstErrorStep !== this.currentStep) {
      this.goToStep(firstErrorStep);
    }

    if (firstErrorField) {
      const el = this.form.elements[firstErrorField];
      const targetFocus = el instanceof RadioNodeList ? el[0] : el;
      if (targetFocus && typeof targetFocus.focus === 'function') {
        targetFocus.focus();
      }
    }
  }

  /**
   * Renders friendly success state on successful completion.
   */
  handleSuccess(result) {
    // Clear draft upon verified success
    DraftStorage.clearDraft();

    // Populate confirmed user data
    const user = result.user || {};
    document.getElementById('success-user-name').textContent = user.fullName || 'Member';
    document.getElementById('success-user-id').textContent = user.id || 'usr_registered';
    document.getElementById('success-user-email').textContent = user.email || '—';
    document.getElementById('success-user-workspace').textContent = user.workspaceName || '—';

    const roleTitle = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Developer';
    document.getElementById('success-user-role').textContent = `${roleTitle} (${user.teamSize || 'Solo'})`;

    // Swap views
    this.formCard.hidden = true;
    this.successScreen.hidden = false;
    this.successScreen.focus();

    this.announceMessage('Account created successfully! Welcome aboard.');
  }

  /**
   * Sets in-flight visual and accessibility state.
   */
  setInFlight(inFlight) {
    this.isSubmitting = inFlight;
    this.btnSubmit.disabled = inFlight;
    this.btnBack.disabled = inFlight;
    this.btnSubmit.setAttribute('aria-busy', inFlight ? 'true' : 'false');
    this.btnSubmit.classList.toggle('in-flight', inFlight);

    const btnText = this.btnSubmit.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = inFlight ? 'Creating account...' : 'Create Account';
    }
  }

  /**
   * Displays global alert message.
   */
  showGlobalAlert(msg) {
    this.globalAlertMsg.textContent = msg;
    this.globalAlert.hidden = false;
  }

  /**
   * Hides global alert.
   */
  hideGlobalAlert() {
    this.globalAlert.hidden = true;
    this.globalAlertMsg.textContent = '';
  }

  /**
   * Speaks a status update to screen readers via aria-live polite region.
   */
  announceMessage(msg) {
    if (!this.announcer) return;
    this.announcer.textContent = '';
    setTimeout(() => {
      this.announcer.textContent = msg;
    }, 50);
  }
}

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SignupApp();
});

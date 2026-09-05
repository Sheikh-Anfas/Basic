/**
 * LocalStorage draft management for Signup Form.
 * Rule: "Refreshing the page mid-flow must not wipe the user's data."
 */

const DRAFT_KEY = 'signup_form_draft_v1';
let debounceTimer = null;

export const DraftStorage = {
  /**
   * Saves form draft with debounce (300ms) to avoid excessive localStorage thrashing.
   * @param {Object} formData 
   * @param {number} currentStep 
   * @param {Function} onSaved 
   */
  saveDraft(formData, currentStep = 1, onSaved = null) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const payload = {
          step: currentStep,
          data: formData,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        if (typeof onSaved === 'function') {
          onSaved(payload.savedAt);
        }
      } catch (err) {
        console.warn('Could not save draft to localStorage:', err);
      }
    }, 300);
  },

  /**
   * Synchronously saves immediately without debounce (e.g. before navigating or on page unload).
   */
  saveImmediately(formData, currentStep = 1) {
    try {
      const payload = {
        step: currentStep,
        data: formData,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      return payload;
    } catch (err) {
      console.warn('Immediate draft save failed:', err);
      return null;
    }
  },

  /**
   * Loads the existing draft if present.
   * @returns {{ step: number, data: Object, savedAt: string } | null}
   */
  loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.data) {
        return parsed;
      }
      return null;
    } catch (err) {
      console.warn('Could not read draft from localStorage:', err);
      return null;
    }
  },

  /**
   * Clears the saved draft upon successful registration or manual reset.
   */
  clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.warn('Could not clear draft:', err);
    }
  },

  /**
   * Formats an ISO date string into a friendly time representation.
   * @param {string} isoString 
   * @returns {string}
   */
  formatSavedTime(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  }
};

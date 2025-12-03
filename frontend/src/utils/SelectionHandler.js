/**
 * Utility for handling text selection and highlighting
 */

export class SelectionHandler {
  /**
   * Get the currently selected text and its context.
   * Supports both Council mode (stage, model) and Synthesizer mode (noteId, noteTitle).
   * @returns {Object|null} Selection object or null if no valid selection
   */
  static getSelection() {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      selection.toString().trim().length === 0
    ) {
      return null;
    }

    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);

    // Get the common ancestor container
    let container = range.commonAncestorContainer;

    // If it's a text node, get the parent element
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // Find the response container (has data attributes for context)
    // Look for data-source-type first (new format), fallback to data-message-index (legacy)
    let responseContainer = container;
    while (responseContainer && !responseContainer.dataset.sourceType && !responseContainer.dataset.messageIndex) {
      responseContainer = responseContainer.parentElement;
    }

    if (!responseContainer) {
      return null;
    }

    // Get bounding rect for positioning
    const rect = range.getBoundingClientRect();

    // Get the full source content from the response container
    const sourceContent = responseContainer.textContent || "";

    // Determine source type (default to 'council' for backward compatibility)
    const sourceType = responseContainer.dataset.sourceType || 'council';

    // Base selection object
    const baseSelection = {
      text: selectedText,
      sourceType,
      range: range.cloneRange(),
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      sourceContent,
    };

    // Add source-type specific fields
    if (sourceType === 'council') {
      return {
        ...baseSelection,
        messageIndex: parseInt(responseContainer.dataset.messageIndex),
        stage: parseInt(responseContainer.dataset.stage),
        model: responseContainer.dataset.model,
      };
    } else if (sourceType === 'synthesizer') {
      return {
        ...baseSelection,
        noteId: responseContainer.dataset.noteId,
        noteTitle: responseContainer.dataset.noteTitle,
        sourceUrl: responseContainer.dataset.sourceUrl,
        noteModel: responseContainer.dataset.noteModel,
      };
    }

    // Unknown source type, return base selection
    return baseSelection;
  }

  /**
   * Clear the current text selection
   */
  static clearSelection() {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  /**
   * Check if there is currently a valid selection
   * @returns {boolean}
   */
  static hasSelection() {
    const selection = window.getSelection();
    return (
      selection &&
      !selection.isCollapsed &&
      selection.toString().trim().length > 0
    );
  }

  /**
   * Create a persistent highlight for a comment
   * @param {HTMLElement} container - The container element with data attributes
   * @param {string} selectedText - The text to highlight
   * @param {string} commentId - Unique ID for the comment
   * @returns {HTMLElement|null} The created highlight element
   */
  static createHighlight(container, selectedText, commentId) {
    if (!container || !selectedText) return null;

    // Find all text nodes in container
    const textNodes = this._getTextNodes(container);

    for (const node of textNodes) {
      const text = node.textContent;
      const index = text.indexOf(selectedText);

      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + selectedText.length);

        const highlight = document.createElement("mark");
        highlight.className = "text-highlight";
        highlight.dataset.commentId = commentId;

        try {
          range.surroundContents(highlight);
          return highlight;
        } catch (e) {
          // If surroundContents fails, try a different approach
          console.warn("Could not create highlight:", e);
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Remove a highlight by comment ID
   * @param {string} commentId - The comment ID to remove
   */
  static removeHighlight(commentId) {
    const highlights = document.querySelectorAll(
      `[data-comment-id="${commentId}"]`
    );
    highlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      parent.removeChild(highlight);
      parent.normalize(); // Merge adjacent text nodes
    });
  }

  /**
   * Get all text nodes within an element
   * @param {HTMLElement} element - The element to search
   * @returns {Node[]} Array of text nodes
   * @private
   */
  static _getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim().length > 0) {
        textNodes.push(node);
      }
    }

    return textNodes;
  }

  /**
   * Calculate optimal popup position near highlighted text
   * @param {DOMRect} rect - The bounding rect of the highlighted text
   * @param {number} popupWidth - Width of the popup (default 300)
   * @param {number} popupHeight - Estimated height of popup (default 150)
   * @returns {Object} Position object with top and left coordinates
   */
  static calculatePopupPosition(rect, popupWidth = 300, popupHeight = 150) {
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Default: position to the right of the highlight
    let top = rect.top + scrollY - popupHeight / 2 + rect.height / 2;
    let left = rect.right + scrollX + 10;

    // Check if popup would go off-screen to the right
    if (left + popupWidth > window.innerWidth + scrollX) {
      // Position to the left instead
      left = rect.left + scrollX - popupWidth - 10;
    }

    // Check if popup would go off-screen to the left
    if (left < scrollX) {
      // Position below the highlight
      top = rect.bottom + scrollY + 10;
      left = rect.left + scrollX;
    }

    // Ensure popup doesn't go above viewport
    if (top < scrollY) {
      top = rect.bottom + scrollY + 10;
    }

    // Ensure popup doesn't go below viewport
    if (top + popupHeight > window.innerHeight + scrollY) {
      top = rect.top + scrollY - popupHeight - 10;
    }

    return { top, left };
  }

  /**
   * Calculate position for floating comment directly below selected text
   * @param {DOMRect} rect - The bounding rect of the highlighted text
   * @returns {Object} Position object with top and left coordinates
   */
  static calculateFloatingCommentPosition(rect) {
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Position directly below the highlight
    const top = rect.bottom + scrollY + 4;
    const left = rect.left + scrollX;

    return { top, left };
  }
}

/**
 * UIController component for managing user interface interactions and display updates
 * Handles on-screen keyboard, sentence display, score updates, and visual feedback
 * Requirements: 1.4, 2.1, 2.2, 2.5, 3.3, 4.5
 */

import type { GuessResult } from './GameEngine.js';
import type { LeaderboardEntry } from '../types/game.js';
import type { ScoreSubmissionRequest } from '../types/api.js';
import { GameEngine } from './GameEngine.js';
import { apiClient } from '../services/apiClient.js';

/**
 * Configuration for UI feedback animations and timing
 */
interface UIConfig {
  animationDuration: number;
  feedbackDelay: number;
  messageDisplayTime: number;
}

/**
 * UIController manages all user interface interactions and visual feedback
 */
export class UIController {
  private gameEngine: GameEngine;
  private config: UIConfig;
  private keyboardElement: HTMLElement | null = null;
  private sentenceElement: HTMLElement | null = null;
  private scoreElement: HTMLElement | null = null;
  private streakElement: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;
  private completionModal: HTMLElement | null = null;
  private leaderboardModal: HTMLElement | null = null;
  private modalFocusHandlers = new WeakMap<HTMLElement, (e: KeyboardEvent) => void>();

  constructor(gameEngine: GameEngine, config?: Partial<UIConfig>) {
    this.gameEngine = gameEngine;
    this.config = {
      animationDuration: 300,
      feedbackDelay: 150,
      messageDisplayTime: 3000,
      ...config
    };
    
    this.initializeElements();
    this.setupEventListeners();
  }

  /**
   * Initialize DOM element references
   * Requirements: 1.4, 2.1
   */
  private initializeElements(): void {
    this.keyboardElement = document.getElementById('keyboard');
    this.sentenceElement = document.getElementById('sentence-area');
    this.scoreElement = document.getElementById('current-score');
    this.streakElement = document.getElementById('current-streak');
    this.messageElement = document.getElementById('message-area');
    this.completionModal = document.getElementById('completion-modal');
    this.leaderboardModal = document.getElementById('leaderboard-modal');

    if (!this.keyboardElement || !this.sentenceElement || !this.scoreElement || 
        !this.streakElement || !this.messageElement) {
      throw new Error('Required UI elements not found in DOM');
    }
  }

  /**
   * Set up event listeners for UI interactions
   * Enhanced with accessibility and modal management
   * Requirements: 1.4, 2.1
   */
  private setupEventListeners(): void {
    // Leaderboard button
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
    }

    // Close leaderboard button
    const closeLeaderboardBtn = document.getElementById('close-leaderboard');
    if (closeLeaderboardBtn) {
      closeLeaderboardBtn.addEventListener('click', () => this.hideLeaderboard());
    }

    // Score submission form
    const scoreForm = document.getElementById('score-form');
    if (scoreForm) {
      scoreForm.addEventListener('submit', (e) => this.handleScoreSubmission(e));
    }

    // Skip submission button
    const skipSubmissionBtn = document.getElementById('skip-submission');
    if (skipSubmissionBtn) {
      skipSubmissionBtn.addEventListener('click', () => this.hideCompletionDialog());
    }

    // Enhanced modal interactions
    if (this.leaderboardModal) {
      this.leaderboardModal.addEventListener('click', (e) => {
        if (e.target === this.leaderboardModal) {
          this.hideLeaderboard();
        }
      });
    }

    if (this.completionModal) {
      this.completionModal.addEventListener('click', (e) => {
        if (e.target === this.completionModal) {
          // Don't close completion modal by clicking outside - require explicit action
        }
      });
    }

    // Enhanced keyboard event listeners
    document.addEventListener('keydown', (e) => this.handleGlobalKeyboardInput(e));
    
    // Focus management for accessibility
    document.addEventListener('focusin', (e) => this.handleFocusManagement(e));
    
    // Orientation change handling for mobile devices
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleOrientationChange(), 100);
    });
    
    // Resize handling for responsive design
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Handle global keyboard input including modal navigation
   * Requirements: 1.4
   */
  private handleGlobalKeyboardInput(event: KeyboardEvent): void {
    // Handle Escape key for modal closing
    if (event.key === 'Escape') {
      if (!this.leaderboardModal?.classList.contains('hidden')) {
        this.hideLeaderboard();
        return;
      }
      if (!this.completionModal?.classList.contains('hidden')) {
        // Don't close completion modal with Escape - require explicit action
        return;
      }
    }
    
    // Handle letter input only when no modal is open
    const isModalOpen = !this.leaderboardModal?.classList.contains('hidden') || 
                       !this.completionModal?.classList.contains('hidden');
    
    if (!isModalOpen) {
      this.handleKeyboardInput(event);
    }
  }

  /**
   * Handle focus management for accessibility
   * Requirements: 1.4
   */
  private handleFocusManagement(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    // Ensure focus stays within modals when they're open
    if (this.leaderboardModal && !this.leaderboardModal.classList.contains('hidden')) {
      if (!this.leaderboardModal.contains(target)) {
        const firstFocusable = this.leaderboardModal.querySelector('button, input, [tabindex]:not([tabindex="-1"])') as HTMLElement;
        firstFocusable?.focus();
      }
    }
    
    if (this.completionModal && !this.completionModal.classList.contains('hidden')) {
      if (!this.completionModal.contains(target)) {
        const nameInput = document.getElementById('player-name') as HTMLInputElement;
        nameInput?.focus();
      }
    }
  }

  /**
   * Handle orientation changes on mobile devices
   * Requirements: 1.4
   */
  private handleOrientationChange(): void {
    // Force a re-render of the keyboard to adjust for new orientation
    if (this.keyboardElement) {
      this.renderKeyboard();
    }
    
    // Adjust modal positioning if needed
    this.adjustModalPositioning();
  }

  /**
   * Handle window resize events
   * Requirements: 1.4
   */
  private resizeTimeout: number | undefined;

  private handleResize(): void {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.adjustModalPositioning();
    }, 150);
  }

  /**
   * Adjust modal positioning for different screen sizes
   * Requirements: 1.4
   */
  private adjustModalPositioning(): void {
    // Ensure modals are properly positioned on small screens
    const modals = [this.leaderboardModal, this.completionModal];
    
    modals.forEach(modal => {
      if (modal && !modal.classList.contains('hidden')) {
        const modalContent = modal.querySelector('.modal-content') as HTMLElement;
        if (modalContent) {
          // Reset any inline styles that might interfere
          modalContent.style.maxHeight = '';
          modalContent.style.overflow = '';
          
          // Adjust for small screens
          if (window.innerHeight < 600) {
            modalContent.style.maxHeight = '90vh';
            modalContent.style.overflow = 'auto';
          }
        }
      }
    });
  }

  /**
   * Render the on-screen keyboard with letter buttons
   * Enhanced with accessibility features and touch support
   * Requirements: 1.4, 2.1, 2.2
   */
  renderKeyboard(): void {
    if (!this.keyboardElement) return;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const guessedLetters = this.gameEngine.getGuessedLetters();

    this.keyboardElement.innerHTML = '';

    for (const letter of letters) {
      const button = document.createElement('button');
      button.className = 'key';
      button.textContent = letter;
      button.id = `key-${letter}`;
      button.type = 'button';
      
      // Enhanced accessibility attributes
      button.setAttribute('aria-label', `Letter ${letter}`);
      button.setAttribute('role', 'button');
      
      // Add keyboard navigation support
      button.tabIndex = 0;

      // Check if letter has been guessed and apply appropriate styling
      if (guessedLetters.has(letter)) {
        button.disabled = true;
        button.classList.add('disabled');
        button.setAttribute('aria-disabled', 'true');
        button.tabIndex = -1; // Remove from tab order when disabled
        
        // Add visual feedback for correct/incorrect guesses
        const gameState = this.gameEngine.getGameState();
        if (gameState.revealedLetters.has(letter)) {
          button.classList.add('correct');
          button.setAttribute('aria-label', `Letter ${letter} - correct guess, found in sentence`);
        } else {
          button.classList.add('incorrect');
          button.setAttribute('aria-label', `Letter ${letter} - incorrect guess, not in sentence`);
        }
      } else {
        button.setAttribute('aria-label', `Letter ${letter} - click to guess`);
        button.setAttribute('aria-describedby', 'keyboard-instructions');
        
        // Add click and keyboard event listeners
        button.addEventListener('click', () => this.handleLetterClick(letter));
        button.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e, letter));
        
        // Enhanced touch support
        button.addEventListener('touchstart', (e) => this.handleTouchStart(e, button), { passive: true });
        button.addEventListener('touchend', (e) => this.handleTouchEnd(e, button), { passive: true });
      }

      this.keyboardElement.appendChild(button);
    }
    
    // Add keyboard instructions for screen readers
    this.addKeyboardInstructions();
  }

  /**
   * Add keyboard navigation instructions for accessibility
   * Requirements: 1.4
   */
  private addKeyboardInstructions(): void {
    let instructionsElement = document.getElementById('keyboard-instructions');
    
    if (!instructionsElement) {
      instructionsElement = document.createElement('div');
      instructionsElement.id = 'keyboard-instructions';
      instructionsElement.className = 'sr-only';
      instructionsElement.textContent = 'Use arrow keys to navigate between letters, Enter or Space to select a letter, or use your physical keyboard to type letters directly.';
      
      if (this.keyboardElement?.parentNode) {
        this.keyboardElement.parentNode.insertBefore(instructionsElement, this.keyboardElement);
      }
    }
  }

  /**
   * Handle keyboard navigation within the on-screen keyboard
   * Requirements: 1.4
   */
  private handleKeyboardNavigation(event: KeyboardEvent, letter: string): void {
    const currentButton = event.target as HTMLButtonElement;
    const allKeys = Array.from(this.keyboardElement?.querySelectorAll('.key:not([disabled])') || []) as HTMLButtonElement[];
    const currentIndex = allKeys.indexOf(currentButton);
    
    let targetIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % allKeys.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        targetIndex = currentIndex === 0 ? allKeys.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        targetIndex = allKeys.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.handleLetterClick(letter);
        return;
    }
    
    if (targetIndex !== currentIndex && allKeys[targetIndex]) {
      allKeys[targetIndex].focus();
    }
  }

  /**
   * Handle touch start events for enhanced mobile feedback
   * Requirements: 1.4
   */
  private handleTouchStart(_event: TouchEvent, button: HTMLButtonElement): void {
    button.classList.add('touch-active');
    
    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * Handle touch end events for enhanced mobile feedback
   * Requirements: 1.4
   */
  private handleTouchEnd(_event: TouchEvent, button: HTMLButtonElement): void {
    button.classList.remove('touch-active');
  }

  /**
   * Handle letter button clicks from on-screen keyboard
   * Requirements: 2.1, 2.2, 2.5
   */
  private handleLetterClick(letter: string): void {
    try {
      const result = this.gameEngine.processGuess(letter);
      this.handleGuessResult(result);
    } catch (error) {
      console.error('Error processing guess:', error);
      this.showMessage('Invalid guess. Please try again.', 'error');
    }
  }

  /**
   * Handle physical keyboard input
   * Requirements: 1.4, 2.1
   */
  private handleKeyboardInput(event: KeyboardEvent): void {
    // Only process letter keys
    if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
      event.preventDefault();
      const letter = event.key.toUpperCase();
      
      // Check if letter hasn't been guessed yet
      if (!this.gameEngine.hasBeenGuessed(letter)) {
        this.handleLetterClick(letter);
      }
    }
  }

  /**
   * Process and display the result of a letter guess
   * Enhanced with accessibility features
   * Requirements: 2.2, 2.5, 3.3, 4.5
   */
  private handleGuessResult(result: GuessResult): void {
    // Update keyboard visual feedback
    this.updateKeyboardFeedback(result.letter, result.isCorrect);
    
    // Get sentence progress for accessibility
    const gameState = this.gameEngine.getGameState();
    const totalLetters = gameState.currentSentence.replace(/[^a-zA-Z]/g, '').length;
    const revealedCount = gameState.revealedLetters.size;
    
    // Update sentence display with accessibility
    this.updateSentenceDisplayAccessible(result.displaySentence, revealedCount, totalLetters);
    
    // Update score display with accessibility
    this.updateScoreAccessible(
      result.scoreResult.newTotal, 
      this.gameEngine.getConsecutiveCorrect(),
      result.scoreResult.pointsEarned
    );
    
    // Show feedback message
    this.showGuessMessage(result);
    
    // Check for game completion
    if (result.gameComplete) {
      setTimeout(() => this.showCompletionDialog(), this.config.feedbackDelay);
    }
    
    // Re-render keyboard to update button states
    setTimeout(() => this.renderKeyboard(), this.config.feedbackDelay);
  }

  /**
   * Update visual feedback for keyboard buttons
   * Requirements: 2.2, 2.5
   */
  private updateKeyboardFeedback(letter: string, isCorrect: boolean): void {
    const button = document.getElementById(`key-${letter}`);
    if (!button) return;

    // Add visual feedback class
    const feedbackClass = isCorrect ? 'correct' : 'incorrect';
    button.classList.add(feedbackClass);
    
    // Add animation effect
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = '';
    }, this.config.animationDuration);
  }

  /**
   * Update the sentence display area with proper formatting for 5th graders
   * Requirements: 2.1, 2.2, 2.5
   */
  updateSentenceDisplay(sentence: string): void {
    if (!this.sentenceElement) return;

    // Format sentence with proper spacing and styling for readability
    const formattedSentence = this.formatSentenceForDisplay(sentence);
    
    // Add fade effect for smooth updates
    this.sentenceElement.style.opacity = '0.7';
    setTimeout(() => {
      if (this.sentenceElement) {
        this.sentenceElement.innerHTML = formattedSentence;
        this.sentenceElement.style.opacity = '1';
      }
    }, this.config.animationDuration / 2);
  }

  /**
   * Format sentence for display with proper styling and spacing
   * Requirements: 2.1, 2.5
   */
  private formatSentenceForDisplay(sentence: string): string {
    return sentence
      .split('')
      .map(char => {
        if (char === '_') {
          return '<span class="blank-letter">_</span>';
        } else if (/[a-zA-Z]/.test(char)) {
          return `<span class="revealed-letter">${char}</span>`;
        } else {
          return `<span class="punctuation">${char}</span>`;
        }
      })
      .join('');
  }

  /**
   * Update score display showing current points and streak information
   * Requirements: 3.3, 4.5
   */
  updateScore(score: number, streak: number): void {
    if (this.scoreElement) {
      // Add animation effect for score changes
      this.scoreElement.style.transform = 'scale(1.1)';
      this.scoreElement.textContent = score.toString();
      
      setTimeout(() => {
        if (this.scoreElement) {
          this.scoreElement.style.transform = '';
        }
      }, this.config.animationDuration);
    }

    if (this.streakElement) {
      // Add animation effect for streak changes
      this.streakElement.style.transform = 'scale(1.1)';
      this.streakElement.textContent = streak.toString();
      
      // Add special styling for high streaks
      if (streak >= 3) {
        this.streakElement.style.color = 'var(--success-color)';
        this.streakElement.style.fontWeight = 'bold';
      } else {
        this.streakElement.style.color = '';
        this.streakElement.style.fontWeight = '';
      }
      
      setTimeout(() => {
        if (this.streakElement) {
          this.streakElement.style.transform = '';
        }
      }, this.config.animationDuration);
    }
  }

  /**
   * Show feedback message for guess results
   * Requirements: 2.2, 2.5, 4.5
   */
  private showGuessMessage(result: GuessResult): void {
    let message = '';
    let messageType: 'success' | 'error' | 'info' = 'info';

    if (result.isCorrect) {
      if (result.letterInstances === 1) {
        message = `Great! Found 1 "${result.letter}"`;
      } else {
        message = `Excellent! Found ${result.letterInstances} "${result.letter}"s`;
      }
      
      if (result.scoreResult.multiplierUsed > 1) {
        message += ` (${result.scoreResult.multiplierUsed.toFixed(1)}x streak bonus!)`;
      }
      
      messageType = 'success';
    } else {
      message = `Sorry, no "${result.letter}" in the sentence`;
      messageType = 'error';
    }

    this.showMessage(message, messageType);
  }

  /**
   * Display a temporary message to the user
   * Requirements: 2.5
   */
  private messageTimeout: number | undefined;

  showMessage(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (!this.messageElement) return;

    // Clear any existing message timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    // Set message content and styling
    this.messageElement.textContent = text;
    this.messageElement.className = `message-area message-${type}`;
    
    // Auto-clear message after delay
    this.messageTimeout = setTimeout(() => {
      if (this.messageElement) {
        this.messageElement.textContent = 'Click letters to guess the sentence!';
        this.messageElement.className = 'message-area';
      }
    }, this.config.messageDisplayTime);
  }

  /**
   * Show game completion dialog with congratulations message and final score
   * Enhanced with accessibility and focus management
   * Requirements: 5.1, 5.2, 5.4
   */
  showCompletionDialog(): void {
    if (!this.completionModal) return;

    const finalScore = this.gameEngine.getCurrentScore();
    const finalScoreElement = document.getElementById('final-score');
    
    if (finalScoreElement) {
      finalScoreElement.textContent = finalScore.toString();
    }

    // Add congratulations message based on score performance
    this.updateCompletionMessage(finalScore);

    // Show modal with proper accessibility attributes
    this.completionModal.classList.remove('hidden');
    this.completionModal.setAttribute('aria-hidden', 'false');
    
    // Store the previously focused element to restore later
    (this.completionModal as any).previouslyFocusedElement = document.activeElement;
    
    // Clear any previous form data and set focus
    const nameInput = document.getElementById('player-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => {
        nameInput.focus();
        // Announce the completion to screen readers
        this.announceToScreenReader(`Congratulations! You completed today's sentence with a score of ${finalScore} points. Please enter your name to submit your score to the leaderboard.`);
      }, 100);
    }

    // Show completion celebration message
    this.showMessage('🎉 Congratulations! You completed the sentence!', 'success');
    
    // Trap focus within the modal
    this.trapFocusInModal(this.completionModal);
  }



  /**
   * Update completion message based on performance
   * Requirements: 5.1, 5.4
   */
  private updateCompletionMessage(finalScore: number): void {
    const completionModal = this.completionModal;
    if (!completionModal) return;

    const messageElement = completionModal.querySelector('p');
    if (!messageElement) return;

    let congratsMessage = 'You completed today\'s sentence!';
    
    if (finalScore >= 100) {
      congratsMessage = '🌟 Outstanding! You completed today\'s sentence with an excellent score!';
    } else if (finalScore >= 50) {
      congratsMessage = '👏 Great job! You completed today\'s sentence!';
    } else if (finalScore >= 0) {
      congratsMessage = '✅ Well done! You completed today\'s sentence!';
    } else {
      congratsMessage = '💪 You completed today\'s sentence! Keep practicing to improve your score!';
    }

    messageElement.textContent = congratsMessage;
  }

  /**
   * Hide game completion dialog with proper focus restoration
   * Requirements: 2.5
   */
  hideCompletionDialog(): void {
    if (this.completionModal) {
      this.completionModal.classList.add('hidden');
      this.completionModal.setAttribute('aria-hidden', 'true');
      
      // Restore focus to previously focused element
      const previouslyFocused = (this.completionModal as any).previouslyFocusedElement;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      } else {
        // Fallback to leaderboard button
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        leaderboardBtn?.focus();
      }
    }
  }

  /**
   * Handle score submission form with validation
   * Requirements: 6.1, 6.2
   */
  private async handleScoreSubmission(event: Event): Promise<void> {
    event.preventDefault();
    
    const nameInput = document.getElementById('player-name') as HTMLInputElement;

    // Validate player name input
    const validationResult = this.validatePlayerName(nameInput?.value || '');
    if (!validationResult.isValid) {
      this.showMessage(validationResult.errorMessage, 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    const playerName = validationResult.cleanName;
    const score = this.gameEngine.getCurrentScore();
    const gameDate = this.gameEngine.getGameDate();

    // Set loading state
    this.setScoreSubmissionLoadingState(true);

    try {
      await this.submitScoreToLeaderboard(playerName, score, gameDate);
      
      this.showMessage('🎉 Score submitted successfully!', 'success');
      this.hideCompletionDialog();
      
      // Show updated leaderboard after a brief delay
      setTimeout(() => this.showLeaderboard(), 1000);
      
    } catch (error) {
      console.error('Score submission failed:', error);
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to submit score. ';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          errorMessage += 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('network') || error.message.includes('NETWORK_ERROR')) {
          errorMessage += 'Network error. Your score has been saved locally and will sync when connection is restored.';
        } else if (error.message.includes('already submitted')) {
          errorMessage += 'You have already submitted a score for today.';
        } else {
          errorMessage += 'Please try again later.';
        }
      } else {
        errorMessage += 'Please try again later.';
      }
      
      this.showMessage(errorMessage, 'error');
    } finally {
      // Clear loading state
      this.setScoreSubmissionLoadingState(false);
    }
  }

  /**
   * Validate player name input with comprehensive checks
   * Requirements: 6.1
   */
  private validatePlayerName(name: string): { isValid: boolean; errorMessage: string; cleanName: string } {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return { isValid: false, errorMessage: 'Please enter your name', cleanName: '' };
    }
    
    if (trimmedName.length < 2) {
      return { isValid: false, errorMessage: 'Name must be at least 2 characters long', cleanName: '' };
    }
    
    if (trimmedName.length > 20) {
      return { isValid: false, errorMessage: 'Name must be 20 characters or less', cleanName: '' };
    }
    
    // Check for inappropriate characters (allow letters, numbers, spaces, basic punctuation)
    const validNamePattern = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validNamePattern.test(trimmedName)) {
      return { isValid: false, errorMessage: 'Name can only contain letters, numbers, spaces, and basic punctuation', cleanName: '' };
    }
    
    // Check for excessive spaces
    if (trimmedName.includes('  ')) {
      return { isValid: false, errorMessage: 'Name cannot contain multiple consecutive spaces', cleanName: '' };
    }
    
    return { isValid: true, errorMessage: '', cleanName: trimmedName };
  }

  /**
   * Submit score to leaderboard API
   * Requirements: 6.2
   */
  private async submitScoreToLeaderboard(playerName: string, score: number, gameDate: string): Promise<void> {
    const submission: ScoreSubmissionRequest = {
      playerName,
      dailyScore: score,
      gameDate
    };

    try {
      const response = await apiClient.submitScore(submission);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to submit score');
      }
      
      console.log('Score submitted successfully:', response);
    } catch (error) {
      console.error('Score submission failed:', error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Show leaderboard modal with top players
   * Enhanced with accessibility and focus management
   * Requirements: 6.4, 6.5
   */
  async showLeaderboard(): Promise<void> {
    if (!this.leaderboardModal) return;

    const leaderboardContent = document.getElementById('leaderboard-content');
    if (!leaderboardContent) return;

    // Show modal with proper accessibility attributes
    this.leaderboardModal.classList.remove('hidden');
    this.leaderboardModal.setAttribute('aria-hidden', 'false');
    
    // Store the previously focused element
    (this.leaderboardModal as any).previouslyFocusedElement = document.activeElement;
    
    this.setLeaderboardLoadingState(true);

    try {
      const leaderboardData = await this.fetchLeaderboardData();
      
      if (leaderboardData.length === 0) {
        leaderboardContent.innerHTML = `
          <div class="empty-leaderboard">
            <p>No scores yet!</p>
            <p>Be the first to complete a sentence and submit your score.</p>
          </div>
        `;
        
        // Announce to screen readers
        this.announceToScreenReader('Leaderboard is empty. Be the first to complete a sentence and submit your score.');
      } else {
        leaderboardContent.innerHTML = this.renderLeaderboardTable(leaderboardData);
        
        // Announce leaderboard data to screen readers
        const topPlayer = leaderboardData[0];
        this.announceToScreenReader(`Leaderboard loaded with ${leaderboardData.length} players. Top player is ${topPlayer.playerName} with ${topPlayer.cumulativeScore} points.`);
      }
      
      // Focus the close button after content loads
      setTimeout(() => {
        const closeBtn = document.getElementById('close-leaderboard');
        closeBtn?.focus();
      }, 100);
      
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to load leaderboard. ';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          errorMessage += 'Request timed out. Please check your connection.';
        } else if (error.message.includes('network') || error.message.includes('NETWORK_ERROR')) {
          errorMessage += 'Network error. Showing local scores.';
        } else {
          errorMessage += 'Please try again later.';
        }
      }
      
      leaderboardContent.innerHTML = `
        <div class="error-message">
          <p>${errorMessage}</p>
          <button class="btn btn-primary" onclick="document.getElementById('close-leaderboard').click(); setTimeout(() => document.getElementById('leaderboard-btn').click(), 100);" aria-label="Retry loading leaderboard">
            Retry
          </button>
        </div>
      `;
      
      // Announce error to screen readers
      this.announceToScreenReader(errorMessage);
    }
    
    // Trap focus within the modal
    this.trapFocusInModal(this.leaderboardModal);
  }



  /**
   * Fetch leaderboard data from API
   * Requirements: 6.4
   */
  private async fetchLeaderboardData(): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.getLeaderboard(10);
      
      if (!response.success || !response.leaderboard) {
        throw new Error('Failed to fetch leaderboard data');
      }
      
      return response.leaderboard;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      // Fallback to local scores
      return this.getLocalScores();
    }
  }

  /**
   * Get local scores from localStorage as fallback
   * Requirements: 6.4
   */
  private getLocalScores(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem('guessTheSentence_leaderboard');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse local scores:', error);
      return [];
    }
  }

  /**
   * Render leaderboard table HTML
   * Requirements: 6.4, 6.5
   */
  private renderLeaderboardTable(leaderboardData: LeaderboardEntry[]): string {
    const tableRows = leaderboardData.map((entry, index) => {
      const rank = index + 1;
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      
      return `
        <tr class="leaderboard-row ${rank <= 3 ? 'top-three' : ''}">
          <td class="rank">${rankEmoji}</td>
          <td class="player-name">${this.escapeHtml(entry.playerName)}</td>
          <td class="score">${entry.cumulativeScore.toLocaleString()}</td>
          <td class="games">${entry.gamesPlayed}</td>
          <td class="last-played">${this.formatDate(entry.lastPlayedDate)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="leaderboard-table-container">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Total Score</th>
              <th>Games</th>
              <th>Last Played</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS attacks
   * Requirements: 6.4
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date for display
   * Requirements: 6.5
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (dateString === today.toISOString().split('T')[0]) {
        return 'Today';
      } else if (dateString === yesterday.toISOString().split('T')[0]) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Hide leaderboard modal with proper focus restoration
   * Requirements: 4.5
   */
  hideLeaderboard(): void {
    if (this.leaderboardModal) {
      this.leaderboardModal.classList.add('hidden');
      this.leaderboardModal.setAttribute('aria-hidden', 'true');
      
      // Restore focus to previously focused element
      const previouslyFocused = (this.leaderboardModal as any).previouslyFocusedElement;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      } else {
        // Fallback to leaderboard button
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        leaderboardBtn?.focus();
      }
    }
  }

  /**
   * Initialize the UI with current game state
   * Requirements: 1.4, 2.1, 3.3
   */
  initializeUI(): void {
    // Render initial keyboard
    this.renderKeyboard();
    
    // Update displays with current game state
    const gameState = this.gameEngine.getGameState();
    this.updateSentenceDisplay(this.gameEngine.getDisplaySentence());
    this.updateScore(gameState.score, gameState.consecutiveCorrect);
    
    // Show initial message
    this.showMessage('Click letters to guess the sentence!', 'info');
  }

  /**
   * Refresh the entire UI to match current game state
   * Requirements: 2.1, 2.5, 3.3
   */
  refreshUI(): void {
    this.renderKeyboard();
    this.updateSentenceDisplay(this.gameEngine.getDisplaySentence());
    
    const gameState = this.gameEngine.getGameState();
    this.updateScore(gameState.score, gameState.consecutiveCorrect);
    
    if (gameState.isComplete) {
      this.showCompletionDialog();
    }
  }

  /**
   * Set loading state for sentence display
   * Requirements: 2.1, 2.5
   */
  setLoadingState(isLoading: boolean): void {
    if (!this.sentenceElement) return;

    if (isLoading) {
      this.sentenceElement.innerHTML = '<div class="loading-spinner">Loading today\'s sentence...</div>';
      this.sentenceElement.style.opacity = '0.7';
      
      // Disable keyboard during loading
      if (this.keyboardElement) {
        this.keyboardElement.style.pointerEvents = 'none';
        this.keyboardElement.style.opacity = '0.5';
      }
    } else {
      this.sentenceElement.style.opacity = '1';
      
      // Re-enable keyboard
      if (this.keyboardElement) {
        this.keyboardElement.style.pointerEvents = '';
        this.keyboardElement.style.opacity = '1';
      }
    }
  }

  /**
   * Set loading state for leaderboard
   * Requirements: 6.4, 7.5
   */
  setLeaderboardLoadingState(isLoading: boolean): void {
    const leaderboardContent = document.getElementById('leaderboard-content');
    if (!leaderboardContent) return;

    if (isLoading) {
      leaderboardContent.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      `;
    }
  }

  /**
   * Set loading state for score submission
   * Requirements: 6.2, 7.5
   */
  setScoreSubmissionLoadingState(isLoading: boolean): void {
    const submitBtn = document.querySelector('#score-form button[type="submit"]') as HTMLButtonElement;
    const skipBtn = document.getElementById('skip-submission') as HTMLButtonElement;
    
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Submitting...' : 'Submit Score';
    }
    
    if (skipBtn) {
      skipBtn.disabled = isLoading;
    }
  }

  /**
   * Handle errors and display user-friendly messages
   * Requirements: 2.5
   */
  handleError(error: Error, context: string): void {
    console.error(`UI Error in ${context}:`, error);
    
    let userMessage = 'Something went wrong. Please try again.';
    
    if (error.message.includes('Invalid letter')) {
      userMessage = 'Please select a valid letter.';
    } else if (error.message.includes('already been guessed')) {
      userMessage = 'You already guessed that letter.';
    } else if (error.message.includes('Game is already complete')) {
      userMessage = 'The game is already finished!';
    }
    
    this.showMessage(userMessage, 'error');
    this.announceToScreenReader(userMessage);
  }

  /**
   * Trap focus within a modal for accessibility
   * Requirements: 1.4
   */
  private trapFocusInModal(modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [href]'
    ) as NodeListOf<HTMLElement>;
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    // Remove any existing listeners
    const existingHandler = this.modalFocusHandlers.get(modal);
    if (existingHandler) {
      modal.removeEventListener('keydown', existingHandler);
    }
    
    // Add new listener
    this.modalFocusHandlers.set(modal, handleTabKey);
    modal.addEventListener('keydown', handleTabKey);
  }

  /**
   * Announce messages to screen readers
   * Requirements: 1.4
   */
  private announceToScreenReader(message: string): void {
    // Create or update the live region for announcements
    let announcer = document.getElementById('screen-reader-announcer');
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'screen-reader-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    
    // Clear and set the message
    announcer.textContent = '';
    setTimeout(() => {
      announcer!.textContent = message;
    }, 100);
  }

  /**
   * Update sentence display with enhanced accessibility
   * Requirements: 2.1, 2.2, 2.5
   */
  updateSentenceDisplayAccessible(sentence: string, revealedCount: number, totalLetters: number): void {
    this.updateSentenceDisplay(sentence);
    
    // Announce progress to screen readers
    const progress = `${revealedCount} of ${totalLetters} letters revealed`;
    const sentenceElement = document.getElementById('sentence-area');
    
    if (sentenceElement) {
      sentenceElement.setAttribute('aria-label', `Current sentence: ${sentence.replace(/_/g, 'blank')}. ${progress}`);
    }
  }

  /**
   * Enhanced score update with accessibility announcements
   * Requirements: 3.3, 4.5
   */
  updateScoreAccessible(score: number, streak: number, pointsEarned: number): void {
    this.updateScore(score, streak);
    
    // Announce significant score changes
    if (pointsEarned !== 0) {
      let announcement = '';
      if (pointsEarned > 0) {
        announcement = `Earned ${pointsEarned} points. Total score: ${score}`;
        if (streak > 1) {
          announcement += `. Streak: ${streak}`;
        }
      } else {
        announcement = `Lost ${Math.abs(pointsEarned)} points. Total score: ${score}. Streak reset.`;
      }
      
      // Delay announcement to avoid conflicts with other messages
      setTimeout(() => this.announceToScreenReader(announcement), 500);
    }
  }
}
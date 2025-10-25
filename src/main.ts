import './styles/main.css';
import { GameEngine } from './components/GameEngine.js';
import { UIController } from './components/UIController.js';
import { getTodayDateString } from './types/index.js';
import { apiClient } from './services/apiClient.js';

// Global game instances
let gameEngine: GameEngine | undefined;
let uiController: UIController | undefined;

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing Guess the Sentence Game...');
    
    // Create game engine and UI controller
    gameEngine = new GameEngine();
    uiController = new UIController(gameEngine);
    
    // Check API health and sync pending submissions
    checkApiHealthAndSync();
    
    // Initialize the game for today
    await initializeGame();
    
    console.log('Game initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    showErrorMessage('Failed to load the game. Please refresh the page.');
  }
});

/**
 * Initialize a new game session
 */
async function initializeGame(): Promise<void> {
  if (!gameEngine || !uiController) {
    throw new Error('Game components not initialized');
  }

  try {
    // Show loading state
    uiController.setLoadingState(true);
    
    // Initialize game engine with today's date
    const today = getTodayDateString();
    await gameEngine.initializeGame(today);
    
    // Initialize UI with current game state
    uiController.initializeUI();
    
    // Hide loading state
    uiController.setLoadingState(false);
    
  } catch (error) {
    console.error('Error initializing game:', error);
    if (uiController) {
      uiController.handleError(error as Error, 'game initialization');
    }
    
    // Show fallback content
    showFallbackGame();
  }
}

/**
 * Show fallback game content when sentence loading fails
 */
function showFallbackGame(): void {
  if (uiController) {
    uiController.setLoadingState(false);
    uiController.showMessage('Using offline mode. Some features may be limited.', 'info');
  }
}

/**
 * Check API health and sync pending submissions
 * Requirements: 7.3, 7.5
 */
async function checkApiHealthAndSync(): Promise<void> {
  try {
    const isHealthy = await apiClient.checkApiHealth();
    
    if (isHealthy) {
      console.log('API is healthy, syncing pending submissions...');
      await apiClient.syncPendingSubmissions();
    } else {
      console.warn('API is not available, running in offline mode');
    }
  } catch (error) {
    console.warn('API health check failed:', error);
  }
}

/**
 * Handle online/offline events for better user experience
 * Requirements: 7.3, 7.5
 */
function setupNetworkEventHandlers(): void {
  window.addEventListener('online', async () => {
    console.log('Connection restored, syncing data...');
    if (uiController) {
      uiController.showMessage('Connection restored! Syncing data...', 'info');
    }
    
    try {
      await apiClient.syncPendingSubmissions();
      if (uiController) {
        uiController.showMessage('Data synced successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to sync data after reconnection:', error);
    }
  });

  window.addEventListener('offline', () => {
    console.log('Connection lost, switching to offline mode');
    if (uiController) {
      uiController.showMessage('Connection lost. Running in offline mode.', 'info');
    }
  });
}

/**
 * Show error message to user
 */
function showErrorMessage(message: string): void {
  const messageElement = document.getElementById('message-area');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.className = 'message-area message-error';
  }
}

// Set up network event handlers
setupNetworkEventHandlers();

// Export game instances for debugging and testing
if (typeof window !== 'undefined') {
  (window as typeof window & { 
    gameEngine: typeof gameEngine;
    uiController: typeof uiController;
    apiClient: typeof apiClient;
  }).gameEngine = gameEngine;
  (window as typeof window & { 
    gameEngine: typeof gameEngine;
    uiController: typeof uiController;
    apiClient: typeof apiClient;
  }).uiController = uiController;
  (window as typeof window & { 
    gameEngine: typeof gameEngine;
    uiController: typeof uiController;
    apiClient: typeof apiClient;
  }).apiClient = apiClient;
}

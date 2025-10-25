# Requirements Document

## Introduction

A daily word game called "Guess the Sentence" designed for 5th grade students, similar to hangman but with sentence guessing and a scoring system. The game will be deployed as a website using GitHub Pages and built with TypeScript. Players guess letters to reveal a hidden sentence, earning or losing points based on correct/incorrect guesses with streak multipliers for consecutive correct guesses.

## Glossary

- **Game_System**: The web-based "Guess the Sentence" application
- **Player**: A 5th grade student using the game
- **Daily_Sentence**: The target sentence that changes each day for all players
- **Letter_Guess**: A single alphabetic character selected by the player
- **Streak_Multiplier**: A 1.5x point bonus applied to consecutive correct letter guesses
- **On_Screen_Keyboard**: The clickable alphabet interface for letter selection
- **Game_Session**: A single play instance for one player on one day
- **Global_Leaderboard**: A persistent ranking system showing cumulative scores for all players across multiple days

## Requirements

### Requirement 1

**User Story:** As a 5th grade student, I want to play a daily sentence guessing game, so that I can have fun while practicing reading and spelling skills.

#### Acceptance Criteria

1. THE Game_System SHALL display a new Daily_Sentence each day for all players
2. THE Game_System SHALL reset each Player's score to 0 points at the start of each new day
3. THE Game_System SHALL display the Daily_Sentence with letters hidden as blanks or dashes
4. THE Game_System SHALL provide an On_Screen_Keyboard with all 26 letters of the alphabet
5. THE Game_System SHALL be accessible via web browser and deployable to GitHub Pages

### Requirement 2

**User Story:** As a player, I want to guess letters by clicking on an on-screen keyboard, so that I can reveal the hidden sentence.

#### Acceptance Criteria

1. WHEN a Player clicks a letter on the On_Screen_Keyboard, THE Game_System SHALL disable that letter to prevent re-selection
2. WHEN a Player selects a Letter_Guess that appears in the Daily_Sentence, THE Game_System SHALL reveal all instances of that letter
3. WHEN a Player selects a Letter_Guess that does not appear in the Daily_Sentence, THE Game_System SHALL indicate the incorrect guess
4. THE Game_System SHALL track all Letter_Guess attempts for the current Game_Session
5. THE Game_System SHALL display the current state of the revealed Daily_Sentence after each Letter_Guess

### Requirement 3

**User Story:** As a player, I want to earn points for correct guesses and lose points for incorrect guesses, so that I can track my performance.

#### Acceptance Criteria

1. WHEN a Player makes a Letter_Guess that does not appear in the Daily_Sentence, THE Game_System SHALL subtract 10 points from the Player's score
2. WHEN a Player makes a Letter_Guess that appears in the Daily_Sentence, THE Game_System SHALL add 10 points for each instance of that letter
3. THE Game_System SHALL display the Player's current score after each Letter_Guess
4. THE Game_System SHALL ensure the Player's score cannot go below 0 points
5. THE Game_System SHALL maintain the Player's score throughout the entire Game_Session

### Requirement 4

**User Story:** As a player, I want to receive bonus points for consecutive correct guesses, so that I am rewarded for maintaining accuracy.

#### Acceptance Criteria

1. WHEN a Player makes the first correct Letter_Guess, THE Game_System SHALL award 10 points per letter instance with no multiplier
2. WHEN a Player makes consecutive correct Letter_Guess attempts, THE Game_System SHALL apply a Streak_Multiplier of 1.5x to the previous correct guess's per-letter point value
3. WHEN a Player makes an incorrect Letter_Guess, THE Game_System SHALL reset the per-letter point value to 10 points for the next correct guess
4. THE Game_System SHALL calculate streak points as: (previous correct guess per-letter value × 1.5 × number of letter instances in current guess)
5. THE Game_System SHALL round streak calculations to the nearest whole number and display the current streak status to the Player

### Requirement 5

**User Story:** As a player, I want to know when I have completed the sentence, so that I can see my final score and feel accomplished.

#### Acceptance Criteria

1. WHEN all letters in the Daily_Sentence have been revealed, THE Game_System SHALL display a completion message
2. WHEN the Daily_Sentence is completed, THE Game_System SHALL show the Player's final score
3. WHEN the Daily_Sentence is completed, THE Game_System SHALL disable further Letter_Guess input
4. THE Game_System SHALL congratulate the Player upon successful completion
5. THE Game_System SHALL provide an option to submit the Player's score to the Global_Leaderboard

### Requirement 6

**User Story:** As a player, I want to submit my score to a global leaderboard with my name, so that I can compete with other players and track my progress over time.

#### Acceptance Criteria

1. WHEN the Daily_Sentence is completed, THE Game_System SHALL provide a name input field for leaderboard submission
2. WHEN a Player enters their name and submits their score, THE Game_System SHALL add the daily score to their cumulative total on the Global_Leaderboard
3. THE Game_System SHALL maintain cumulative scores for each unique player name across multiple days
4. THE Game_System SHALL display the Global_Leaderboard showing player names and their total cumulative scores
5. THE Game_System SHALL allow players to view the leaderboard without completing the current day's game

### Requirement 7

**User Story:** As a game administrator, I want the daily sentences to be stored securely, so that players cannot access future sentences and cheat.

#### Acceptance Criteria

1. THE Game_System SHALL store Daily_Sentence data in an encrypted or obfuscated format that prevents easy inspection
2. THE Game_System SHALL only reveal the current day's Daily_Sentence to the client application
3. THE Game_System SHALL prevent access to future Daily_Sentence content through browser developer tools or source code inspection
4. THE Game_System SHALL use server-side logic or secure external service to determine and serve the appropriate Daily_Sentence
5. THE Game_System SHALL ensure that sentence data cannot be extracted from client-side JavaScript or static files
# Macro Button - Foundry VTT Module

## Project Overview
**Macro Button** is a Foundry VTT module that allows users to drag and drop Macros onto the canvas (Scene) to create interactive buttons. These buttons are technically `Note` documents that have been customized to execute the linked Macro when clicked.

### Key Features
*   **Drag & Drop**: Drag a Macro from the directory to the canvas to create a button.
*   **Interactivity**: Left-click to execute, Right-click (GM) to configure.
*   **Customization**: Configurable icon, label (visibility, position, size), and button size.
*   **Permissions**: Option to make buttons visible/usable by players.
*   **Sync**: Updates are synchronized across clients using `socketlib` (if available) or native Foundry sockets.
*   **Game Settings**: Configurable defaults for new buttons (show name, position, sizes, visibility).

## Technical Architecture

### Core Technologies
*   **Language**: Vanilla JavaScript (ES Modules).
*   **Framework**: Foundry VTT API (v13+).
*   **Rendering**: PIXI.js (direct manipulation of `Note` display objects).
*   **UI**: Handlebars (templates) + CSS.

### Key Components
*   **`scripts/main.js`**: Contains the core logic.
    *   **Hooks**: `dropCanvasData` (creation), `refreshNote` (rendering/interactivity), `init`/`ready` (setup).
    *   **Logic**: Uses `Note` embedded documents to store data via `flags.macro-button`.
    *   **Interactivity**: Manages PIXI events (`pointerdown`, `pointerup`, `drag`) directly on the Note object.
    *   **`MacroButtonConfig`**: A `ApplicationV2` class for the configuration dialog.
*   **`module.json`**: Module manifest defining entry points and compatibility.

### Data Model
Data is stored in the `flags.macro-button` namespace on `Note` documents:
*   `isMacroButton`: Boolean marker.
*   `macroUuid`: UUID of the linked macro.
*   `playerVisible`: Boolean permission flag.
*   `showName`, `namePosition`, `buttonSize`, `nameSize`: Visual configuration.

### Game Settings
Module settings (Configure Settings > Module Settings) define defaults for new buttons:
*   `defaultShowName`: Always/Never/On Hover
*   `defaultNamePosition`: Above/Below/Left/Right
*   `defaultButtonSize`: Small/Medium/Big
*   `defaultNameSize`: Small/Medium/Big
*   `defaultPlayerVisible`: Boolean

## Development & Usage

### Setup
This project is **raw source** (no build step).
*   **No `npm install`**: There are no Node.js dependencies.
*   **No `build`**: Edit `scripts/main.js` or `styles/macro-button.css` directly. changes take effect after a Foundry VTT reload (F5).

### Conventions
*   **Code Style**: Standard JavaScript.
*   **Compatibility**: Designed for Foundry VTT v13 (uses `ApplicationV2`).
*   **Globals**: `MacroButtonConfig` is exposed globally for debugging.
*   **Sockets**: Checks for `socketlib` module; falls back to `game.socket` if missing.

### Common Tasks
*   **Editing Logic**: Modify `scripts/main.js`.
*   **Changing UI**: Edit `templates/button-config.hbs` and update the `MacroButtonConfig` class.
*   **Styling**: Update `styles/macro-button.css`.

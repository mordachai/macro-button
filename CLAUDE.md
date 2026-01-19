# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry VTT module that allows users to drag and drop Macros onto the canvas to create interactive buttons. Buttons are implemented as customized `Note` embedded documents that execute linked macros when clicked.

**Target:** Foundry VTT v13+ (uses `ApplicationV2`)

## Development

**No build step required.** This is raw source - edit files directly and reload Foundry (F5) to see changes.

- **Logic:** `scripts/main.js`
- **Styling:** `styles/macro-button.css` (auto-loaded, no compilation)
- **Templates:** `templates/button-config.hbs`

## Architecture

### Data Storage
Button configuration is stored in `Note` document flags under `flags.macro-button`:
- `isMacroButton` - Boolean marker identifying macro buttons
- `macroUuid` - UUID of the linked macro
- `playerVisible` - Permission flag
- `customIcon` - If true, icon won't sync with macro updates
- `customName` - If true, name won't sync with macro updates
- `showName`, `namePosition`, `buttonSize`, `nameSize` - Visual settings

### Game Settings
Module settings (Configure Settings > Module Settings) define defaults for new buttons:
- `defaultShowName` - Always/Never/On Hover
- `defaultNamePosition` - Above/Below/Left/Right
- `defaultButtonSize` - Small/Medium/Big
- `defaultNameSize` - Small/Medium/Big
- `defaultPlayerVisible` - Boolean

### Key Hooks
- `dropCanvasData` - Creates button when macro is dropped on canvas (uses game settings for defaults)
- `updateMacro` - Syncs icon/name to linked buttons (unless `customIcon`/`customName` is set)
- `refreshNote` - Sets up PIXI rendering and event handlers for buttons
- `init` - Registers Handlebars helper, loads templates, and registers game settings
- `socketlib.ready` / `ready` - Sets up cross-client sync (socketlib or native fallback)

### Rendering
Labels are PIXI.Text objects added as children to Note display objects. The default Note tooltip is hidden.

### Interactivity
PIXI events (`pointerdown`, `pointerup`, `globalpointermove`, `rightdown`) are bound directly to Note objects with drag detection (5px threshold).

## Foundry VTT v13 Patterns

- Use `foundry.applications.handlebars.loadTemplates()` (not deprecated global `loadTemplates()`)
- Use `ApplicationV2` with `HandlebarsApplicationMixin` for dialogs
- Access application APIs via `foundry.applications.api`

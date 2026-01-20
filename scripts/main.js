const MODULE_ID = "macro-button";

// Size configurations
const BUTTON_SIZES = {
    small: 32,
    medium: 64,
    big: 96
};

const NAME_SIZES = {
    small: 24,
    medium: 36,
    big: 60
};

// Register Handlebars helper for equality check
Hooks.once("init", () => {
    Handlebars.registerHelper("eq", (a, b) => a === b);

    // Register module settings for default values
    game.settings.register(MODULE_ID, "defaultShowName", {
        name: "Default Show Name",
        hint: "Default setting for showing button names",
        scope: "world",
        config: true,
        type: String,
        default: "always",
        choices: {
            always: "Always",
            never: "Never",
            hover: "On Hover"
        }
    });

    game.settings.register(MODULE_ID, "defaultNamePosition", {
        name: "Default Name Position",
        hint: "Default position for button names",
        scope: "world",
        config: true,
        type: String,
        default: "right",
        choices: {
            top: "Above",
            bottom: "Below",
            left: "Left",
            right: "Right"
        }
    });

    game.settings.register(MODULE_ID, "defaultButtonSize", {
        name: "Default Button Size",
        hint: "Default size for new macro buttons",
        scope: "world",
        config: true,
        type: String,
        default: "small",
        choices: {
            small: "Small",
            medium: "Medium",
            big: "Big"
        }
    });

    game.settings.register(MODULE_ID, "defaultNameSize", {
        name: "Default Name Size",
        hint: "Default text size for button names",
        scope: "world",
        config: true,
        type: String,
        default: "small",
        choices: {
            small: "Small",
            medium: "Medium",
            big: "Big"
        }
    });

    game.settings.register(MODULE_ID, "defaultPlayerVisible", {
        name: "Default Player Visibility",
        hint: "Whether new buttons are visible to players by default",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

// Socket for cross-client communication
let socket;
Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule(MODULE_ID);
    socket.register("refreshNote", refreshNoteForAll);
});

// Fallback if socketlib not available - use native Foundry socket
Hooks.once("ready", () => {
    if (!socket) {
        game.socket.on(`module.${MODULE_ID}`, (data) => {
            if (data.action === "refreshNote") {
                refreshNoteForAll(data.noteId);
            }
        });
    }
});

function refreshNoteForAll(noteId) {
    const note = canvas.notes.placeables.find(n => n.document.id === noteId);
    if (!note) return;

    const flags = note.document.flags?.[MODULE_ID];
    if (!flags?.isMacroButton) return;

    // Handle visibility for players
    if (!game.user.isGM && !flags.playerVisible) {
        note.visible = false;
        return;
    }
    note.visible = true;

    // Update label
    setupLabel(note);
}

function emitRefresh(noteId) {
    if (socket) {
        socket.executeForEveryone("refreshNote", noteId);
    } else {
        game.socket.emit(`module.${MODULE_ID}`, { action: "refreshNote", noteId });
        refreshNoteForAll(noteId); // Also refresh locally
    }
}

// Load templates on init
Hooks.once("init", async () => {
    await foundry.applications.handlebars.loadTemplates([
        `modules/${MODULE_ID}/templates/button-config.hbs`
    ]);
});

/**
 * Get macro UUIDs from flags, handling migration from old single macroUuid format
 */
function getMacroUuids(flags) {
    if (flags.macroUuids && Array.isArray(flags.macroUuids)) {
        return flags.macroUuids;
    }
    // Migration from old single macroUuid format
    if (flags.macroUuid) {
        return [flags.macroUuid];
    }
    return [];
}

// Handle macro drops on canvas
Hooks.on("dropCanvasData", async (canvas, data) => {
    if (data.type !== "Macro") return;

    const macro = await fromUuid(data.uuid);
    if (!macro) {
        ui.notifications.error("Could not find the dropped macro.");
        return;
    }

    // Get default values from settings
    const defaultButtonSize = game.settings.get(MODULE_ID, "defaultButtonSize");

    const noteData = {
        x: data.x,
        y: data.y,
        texture: { src: macro.img || "icons/svg/dice-target.svg" },
        iconSize: BUTTON_SIZES[defaultButtonSize] || BUTTON_SIZES.small,
        text: " ",
        flags: {
            [MODULE_ID]: {
                isMacroButton: true,
                macroUuids: [data.uuid],
                name: macro.name,
                showName: game.settings.get(MODULE_ID, "defaultShowName"),
                namePosition: game.settings.get(MODULE_ID, "defaultNamePosition"),
                buttonSize: defaultButtonSize,
                nameSize: game.settings.get(MODULE_ID, "defaultNameSize"),
                playerVisible: game.settings.get(MODULE_ID, "defaultPlayerVisible"),
                customIcon: false,
                customName: false
            }
        }
    };

    await canvas.scene.createEmbeddedDocuments("Note", [noteData]);
});

// Sync button icons and names when linked macro is updated
Hooks.on("updateMacro", async (macro, changes) => {
    if (!changes.img && !changes.name) return;
    if (!canvas.scene) return;

    const macroUuid = macro.uuid;
    const linkedNotes = canvas.scene.notes.filter(note => {
        const flags = note.flags?.[MODULE_ID];
        if (!flags?.isMacroButton) return false;
        const uuids = getMacroUuids(flags);
        return uuids.includes(macroUuid);
    });

    for (const note of linkedNotes) {
        const flags = note.flags?.[MODULE_ID];
        const uuids = getMacroUuids(flags);
        const updates = {};

        // Only sync icon/name if this is the first (primary) macro
        if (uuids[0] === macroUuid) {
            if (changes.img && !flags?.customIcon) {
                updates["texture.src"] = macro.img;
            }
            if (changes.name && !flags?.customName) {
                updates[`flags.${MODULE_ID}.name`] = macro.name;
            }
        }

        if (Object.keys(updates).length > 0) {
            await note.update(updates);
            emitRefresh(note.id);
        }
    }
});

// Setup note interactivity and label on refresh
Hooks.on("refreshNote", (note) => {
    const flags = note.document.flags?.[MODULE_ID];
    if (!flags?.isMacroButton) return;

    // Hide entire button from players if not accessible
    if (!game.user.isGM && !flags.playerVisible) {
        note.visible = false;
        return;
    }
    note.visible = true;

    // Hide default tooltip
    if (note.tooltip && note.tooltip instanceof PIXI.DisplayObject) {
        note.tooltip.visible = false;
    }

    // Setup custom label
    setupLabel(note);

    // Make note interactive
    note.eventMode = "static";
    note.cursor = "pointer";

    // Only bind listeners once
    if (!note._macroListenersBound) {
        // Hover events for label visibility
        note.on("pointerover", () => {
            note._macroHover = true;
            updateLabelVisibility(note);
        });

        note.on("pointerout", () => {
            note._macroHover = false;
            updateLabelVisibility(note);
        });

        // Left click: track start position to distinguish click vs drag
        note.on("pointerdown", (event) => {
            if (event.button !== 0) return;

            // Stop propagation to prevent canvas selection box
            event.stopPropagation();

            // Store start positions
            note._macroClickStart = { x: event.global.x, y: event.global.y };
            note._macroDragStart = { x: note.document.x, y: note.document.y };
            note._macroDragging = false;
        });

        note.on("globalpointermove", (event) => {
            if (!note._macroClickStart) return;

            // Only GM can drag
            if (!game.user.isGM) return;

            // In Notes layer, let Foundry handle it
            if (canvas.activeLayer === canvas.notes) return;

            const dist = Math.hypot(
                event.global.x - note._macroClickStart.x,
                event.global.y - note._macroClickStart.y
            );

            // Start dragging if moved more than 5px
            if (dist > 5) {
                note._macroDragging = true;

                // Calculate new position
                const canvasPos = canvas.app.stage.toLocal(event.global);
                note.document.x = canvasPos.x;
                note.document.y = canvasPos.y;
                note.renderFlags.set({ refresh: true });
            }
        });

        note.on("pointerup", async (event) => {
            if (event.button !== 0 || !note._macroClickStart) return;

            const wasDragging = note._macroDragging;
            const newX = note.document.x;
            const newY = note.document.y;

            // Clean up drag state
            delete note._macroClickStart;
            delete note._macroDragStart;
            delete note._macroDragging;

            // If was dragging, update document position
            if (wasDragging) {
                await note.document.update({ x: newX, y: newY });
                return;
            }

            // GM in Notes layer can select/move without executing
            if (game.user.isGM && canvas.activeLayer === canvas.notes) return;

            // Check player permission
            if (!game.user.isGM && !flags.playerVisible) {
                ui.notifications.warn("You don't have permission to use this macro button.");
                return;
            }

            event.stopPropagation();

            // Execute all linked macros
            const macroUuids = getMacroUuids(flags);
            if (macroUuids.length === 0) {
                ui.notifications.warn("No macros linked to this button.");
                return;
            }

            for (const uuid of macroUuids) {
                const macro = await fromUuid(uuid);
                if (macro) {
                    await macro.execute();
                } else {
                    ui.notifications.error(`Linked macro not found: ${uuid}`);
                }
            }
        });

        // Handle pointer up outside of note (cancel drag)
        note.on("pointerupoutside", async (event) => {
            if (!note._macroDragging) {
                delete note._macroClickStart;
                delete note._macroDragStart;
                delete note._macroDragging;
                return;
            }

            // Save final position
            const newX = note.document.x;
            const newY = note.document.y;

            delete note._macroClickStart;
            delete note._macroDragStart;
            delete note._macroDragging;

            await note.document.update({ x: newX, y: newY });
        });

        // Right click: config dialog for GMs
        note.on("rightdown", (event) => {
            if (!game.user.isGM) return;
            event.stopPropagation();
            new MacroButtonConfig(note.document).render(true);
        });

        note._macroListenersBound = true;
    }
});

/**
 * Update label visibility based on showName setting
 */
function updateLabelVisibility(note) {
    const flags = note.document.flags[MODULE_ID];
    if (!note.macroLabel) return;

    if (flags.showName === "always") {
        note.macroLabel.visible = true;
    } else if (flags.showName === "never") {
        note.macroLabel.visible = false;
    } else {
        // "hover" mode
        note.macroLabel.visible = !!note._macroHover;
    }
}

/**
 * Setup or update the custom PIXI label for the note
 */
function setupLabel(note) {
    const flags = note.document.flags[MODULE_ID];
    const name = flags.name || "Macro";
    const position = flags.namePosition || "bottom";
    const nameSize = NAME_SIZES[flags.nameSize] || NAME_SIZES.small;
    const buttonSize = note.document.iconSize || BUTTON_SIZES.small;

    // Remove existing label if present
    if (note.macroLabel) {
        if (note.macroLabel.parent) {
            note.macroLabel.parent.removeChild(note.macroLabel);
        }
        note.macroLabel = null;
    }

    // Create label
    const style = new PIXI.TextStyle({
        fontFamily: "Signika, sans-serif",
        fontSize: nameSize,
        fill: "white",
        stroke: "black",
        strokeThickness: 4,
        align: "center",
        wordWrap: true,
        wordWrapWidth: 250
    });
    note.macroLabel = new PIXI.Text(name, style);
    note.addChild(note.macroLabel);

    // Position the label
    const offset = 8;

    switch (position) {
        case "top":
            note.macroLabel.anchor.set(0.5, 1);
            note.macroLabel.x = 0;
            note.macroLabel.y = -(buttonSize / 2) - offset;
            break;
        case "left":
            note.macroLabel.anchor.set(1, 0.5);
            note.macroLabel.x = -(buttonSize / 2) - offset;
            note.macroLabel.y = 0;
            break;
        case "right":
            note.macroLabel.anchor.set(0, 0.5);
            note.macroLabel.x = (buttonSize / 2) + offset;
            note.macroLabel.y = 0;
            break;
        case "bottom":
        default:
            note.macroLabel.anchor.set(0.5, 0);
            note.macroLabel.x = 0;
            note.macroLabel.y = (buttonSize / 2) + offset;
            break;
    }

    updateLabelVisibility(note);
}

/**
 * Configuration dialog for macro buttons (ApplicationV2)
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class MacroButtonConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(noteDocument, options = {}) {
        super(options);
        this.noteDocument = noteDocument;
    }

    static DEFAULT_OPTIONS = {
        id: "macro-button-config",
        classes: ["macro-button-config"],
        tag: "form",
        window: {
            title: "Configure Macro Button",
            icon: "fas fa-cog",
            resizable: false
        },
        position: {
            width: 400,
            height: "auto"
        },
        form: {
            handler: MacroButtonConfig.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        actions: {
            pickImage: MacroButtonConfig.#onPickImage,
            resetIcon: MacroButtonConfig.#onResetIcon,
            resetName: MacroButtonConfig.#onResetName,
            unlinkMacro: MacroButtonConfig.#onUnlinkMacro,
            save: MacroButtonConfig.#onSave,
            cancel: MacroButtonConfig.#onCancel,
            delete: MacroButtonConfig.#onDelete
        }
    };

    static PARTS = {
        form: {
            template: `modules/${MODULE_ID}/templates/button-config.hbs`
        }
    };

    async _prepareContext(options) {
        const flags = this.noteDocument.flags[MODULE_ID] || {};
        const macroUuids = getMacroUuids(flags);

        // Build enriched HTML for each linked macro
        const linkedMacros = [];
        for (const uuid of macroUuids) {
            const macro = await fromUuid(uuid);
            if (macro) {
                // Create enriched content link using TextEditor
                const enrichedLink = await TextEditor.enrichHTML(`@UUID[${uuid}]`, { async: true });
                linkedMacros.push({
                    uuid: uuid,
                    name: macro.name,
                    img: macro.img || "icons/svg/dice-target.svg",
                    enrichedLink: enrichedLink
                });
            } else {
                // Handle broken links
                linkedMacros.push({
                    uuid: uuid,
                    name: "Unknown Macro",
                    img: "icons/svg/hazard.svg",
                    enrichedLink: `<span class="broken-link"><i class="fas fa-unlink"></i> Broken Link</span>`
                });
            }
        }

        return {
            icon: this.noteDocument.texture?.src || "icons/svg/dice-target.svg",
            name: flags.name || "",
            linkedMacros: linkedMacros,
            hasMacros: linkedMacros.length > 0,
            showName: flags.showName || "always",
            namePosition: flags.namePosition || "bottom",
            buttonSize: flags.buttonSize || "small",
            nameSize: flags.nameSize || "medium",
            playerVisible: flags.playerVisible || false,
            customIcon: flags.customIcon || false,
            customName: flags.customName || false,
            showNameOptions: [
                { value: "always", label: "Always Visible" },
                { value: "hover", label: "On Hover Only" },
                { value: "never", label: "Never (Icon Only)" }
            ],
            namePositionOptions: [
                { value: "top", label: "Above" },
                { value: "bottom", label: "Below" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" }
            ],
            buttonSizeOptions: [
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "big", label: "Big" }
            ],
            nameSizeOptions: [
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "big", label: "Big" }
            ]
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        // Set up drag and drop for the entire dialog
        const dropZone = this.element.querySelector('.linked-macros-section');
        if (dropZone) {
            dropZone.addEventListener('dragover', (event) => {
                event.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', (event) => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', async (event) => {
                event.preventDefault();
                dropZone.classList.remove('drag-over');

                // Parse the drop data
                let data;
                try {
                    data = JSON.parse(event.dataTransfer.getData('text/plain'));
                } catch (e) {
                    return;
                }

                if (data.type !== "Macro") {
                    ui.notifications.warn("Only macros can be dropped here.");
                    return;
                }

                const macro = await fromUuid(data.uuid);
                if (!macro) {
                    ui.notifications.error("Could not find the dropped macro.");
                    return;
                }

                // Check if already linked
                const flags = this.noteDocument.flags[MODULE_ID];
                const macroUuids = getMacroUuids(flags);
                if (macroUuids.includes(data.uuid)) {
                    ui.notifications.warn("This macro is already linked to this button.");
                    return;
                }

                // Add to list
                const newUuids = [...macroUuids, data.uuid];
                await this.noteDocument.update({
                    [`flags.${MODULE_ID}.macroUuids`]: newUuids,
                    [`flags.${MODULE_ID}.-=macroUuid`]: null // Remove old single uuid field if present
                });

                // Re-render
                this.render();
                ui.notifications.info(`Linked macro: ${macro.name}`);
            });
        }
    }

    static async #onPickImage(event, target) {
        const current = this.element.querySelector('input[name="icon"]').value;

        const fp = new FilePicker({
            type: "image",
            current: current,
            callback: (path) => {
                this.element.querySelector('input[name="icon"]').value = path;
                this.element.querySelector('img[data-action="pickImage"]').src = path;
                this.element.querySelector('input[name="customIcon"]').value = "true";
                this.element.querySelector('[data-action="resetIcon"]')?.classList.remove("hidden");
            }
        });
        fp.browse();
    }

    static async #onResetIcon(event, target) {
        const flags = this.noteDocument.flags[MODULE_ID];
        const macroUuids = getMacroUuids(flags);
        const macro = macroUuids.length > 0 ? await fromUuid(macroUuids[0]) : null;
        if (!macro) {
            ui.notifications.error("No linked macro found.");
            return;
        }

        const macroIcon = macro.img || "icons/svg/dice-target.svg";
        this.element.querySelector('input[name="icon"]').value = macroIcon;
        this.element.querySelector('img[data-action="pickImage"]').src = macroIcon;
        this.element.querySelector('input[name="customIcon"]').value = "false";
        this.element.querySelector('[data-action="resetIcon"]')?.classList.add("hidden");
    }

    static async #onResetName(event, target) {
        const flags = this.noteDocument.flags[MODULE_ID];
        const macroUuids = getMacroUuids(flags);
        const macro = macroUuids.length > 0 ? await fromUuid(macroUuids[0]) : null;
        if (!macro) {
            ui.notifications.error("No linked macro found.");
            return;
        }

        this.element.querySelector('input[name="name"]').value = macro.name;
        this.element.querySelector('input[name="customName"]').value = "false";
        this.element.querySelector('[data-action="resetName"]')?.classList.add("hidden");
    }

    static async #onUnlinkMacro(event, target) {
        const uuid = target.dataset.uuid;
        if (!uuid) return;

        const flags = this.noteDocument.flags[MODULE_ID];
        const macroUuids = getMacroUuids(flags);
        const newUuids = macroUuids.filter(u => u !== uuid);

        // Update the document
        await this.noteDocument.update({
            [`flags.${MODULE_ID}.macroUuids`]: newUuids,
            [`flags.${MODULE_ID}.-=macroUuid`]: null // Remove old single uuid field if present
        });

        // Re-render the dialog
        this.render();

        // Notify
        const macro = await fromUuid(uuid);
        ui.notifications.info(`Unlinked macro: ${macro?.name || uuid}`);
    }

    static async #onSave(event, target) {
        const form = this.element;
        form.requestSubmit();
    }

    static #onCancel(event, target) {
        this.close();
    }

    static async #onDelete(event, target) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Delete Macro Button" },
            content: "<p>Are you sure you want to delete this macro button?</p>",
            yes: { label: "Delete", icon: "fas fa-trash" },
            no: { label: "Cancel", icon: "fas fa-times" }
        });
        if (!confirmed) return;

        await this.noteDocument.delete();
        this.close();
    }

    static async #onSubmit(event, form, formData) {
        const data = foundry.utils.expandObject(formData.object);

        // Get button size in pixels
        const buttonSizePixels = BUTTON_SIZES[data.buttonSize] || BUTTON_SIZES.small;

        // Update the note document
        await this.noteDocument.update({
            "texture.src": data.icon,
            "iconSize": buttonSizePixels,
            [`flags.${MODULE_ID}.name`]: data.name,
            [`flags.${MODULE_ID}.showName`]: data.showName,
            [`flags.${MODULE_ID}.namePosition`]: data.namePosition,
            [`flags.${MODULE_ID}.buttonSize`]: data.buttonSize,
            [`flags.${MODULE_ID}.nameSize`]: data.nameSize,
            [`flags.${MODULE_ID}.playerVisible`]: data.playerVisible || false,
            [`flags.${MODULE_ID}.customIcon`]: data.customIcon === "true",
            [`flags.${MODULE_ID}.customName`]: data.customName === "true"
        });

        // Refresh for all clients (slight delay to ensure document sync)
        setTimeout(() => emitRefresh(this.noteDocument.id), 100);
    }
}

// Make available globally for debugging
globalThis.MacroButtonConfig = MacroButtonConfig;

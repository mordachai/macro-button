# Macro Button

**Macro Button** is a module for Foundry VTT that allows you to drag and drop Macros directly onto the canvas to create interactive buttons. These buttons act as shortcuts, allowing you (and optionally your players) to trigger macros directly from the scene.

## Features

*   **Drag & Drop**: Easily create buttons by dragging Macros from your directory onto the scene.
*   **Customizable**: Change icons, labels, sizes, and positioning.
*   **Permissions**: Grant players access to specific macro buttons.
*   **Sync**: Button states and updates are synchronized across all connected clients.

<img width="811" height="495" alt="image" src="https://github.com/user-attachments/assets/edb127df-694f-4cc6-9feb-555e0cc3df2b" />

## How to Use

### Creating Buttons
1.  Open your **Macro Directory**.
2.  Drag a Macro and drop it anywhere on the canvas (Scene).
3.  A button will appear at that location with the Macro's default icon.

### Using Buttons
*   **Left-Click**: Executes the linked Macro.
*   **Right-Click (GM Only)**: Opens the configuration dialog.

### Deleting Buttons
*   **Single Button**: Right-click the button and use the **Delete** button at the bottom of the configuration dialog.
*   **Bulk Delete**: Use the **Journal Notes** tool in the Scene Controls (left toolbar) to select and delete buttons normally. This is useful for removing multiple buttons at once.

## Configuration

Right-clicking a button (as a GM) opens the configuration dialog where you can adjust:

<img width="427" height="406" alt="image" src="https://github.com/user-attachments/assets/8a20b551-e604-4c94-b01a-59e2b0539577" />

*   **Icon**: Click the image to upload or select a custom icon.
*   **Name**: Type a custom label for the button.
*   **Reset Buttons**: If you've customized the name or icon, a small **Reset** (undo) button will appear. Clicking it restores the button's name or icon to match the original Macro.
*   **Automatic Sync**: By default, if you update the name or icon of the original Macro, the button will automatically update to match—*unless* you have set a custom name or icon for that button.
*   **Show Name**:
    *   *Always Visible*: Label is always shown.
    *   *On Hover Only*: Label appears when the mouse hovers over the button.
    *   *Never (Icon Only)*: No text label is displayed.
*   **Name Position**: Place the label Above, Below, Left, or Right of the icon.
*   **Button Size**: Choose between Small, Medium, or Big.
*   **Name Size**: Adjust the text size (Small, Medium, Big).
*   **Player Visible**: Check this to allow players to see and click the button. (Default is GM only).

## License

This project is licensed under the MIT License.

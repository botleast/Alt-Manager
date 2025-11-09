/**
 * Content Script: Runs on the active webpage.
 * This script is responsible for receiving the Auth ID,
 * setting the localStorage value (localStorage.session_v1 = authId), 
 * and prompting the user to reload.
 */

const MESSAGE_BOX_ID = 'extension-reload-prompt';
const LOCAL_STORAGE_KEY = 'session_v1';

/**
 * Creates and displays a floating, dismissible message with a Reload button.
 * @param {string} accountName The name of the account successfully set.
 */
function promptForReload(accountName) {
    // Check if the message box already exists to avoid duplication
    if (document.getElementById(MESSAGE_BOX_ID)) {
        document.getElementById(MESSAGE_BOX_ID).remove();
    }

    const box = document.createElement('div');
    box.id = MESSAGE_BOX_ID;
    box.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #2e1a47; /* Dark Purple */
        color: #e4f0ff;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 99999;
        max-width: 300px;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: transform 0.3s ease-out;
    `;

    box.innerHTML = `
        <div style="font-weight: bold; font-size: 1.1em; color: #a78bfa;">
            Account Switch Complete!
        </div>
        <div>
            Local Storage key 
            <span style="color: #ffcc00;">'${LOCAL_STORAGE_KEY}'</span> 
            set for: 
            <span style="color: #81e6d9;">${accountName}</span>
        </div>
        <button id="reload-btn" style="
            background-color: #60a5fa; /* Blue */
            color: white;
            padding: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        ">
            Click to RELOAD PAGE
        </button>
        <button id="dismiss-btn" style="
            background: none;
            color: #ccc;
            border: none;
            font-size: 0.9em;
            cursor: pointer;
        ">
            Dismiss
        </button>
    `;

    document.body.appendChild(box);

    // Add event listeners for the buttons
    document.getElementById('reload-btn').addEventListener('click', () => {
        window.location.reload();
    });
    
    document.getElementById('dismiss-btn').addEventListener('click', () => {
        box.style.transform = 'translateY(100vh)';
        setTimeout(() => box.remove(), 300);
    });
}


// Listen for messages from the extension's popup.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "SET_LOCAL_STORAGE_AUTH") {
            // Destructure both the Auth ID and the Account Name
            const { authId, name } = request.payload; 

            try {
                // Execute the EXACT command requested: localStorage.session_v1 = authId
                window.localStorage.session_v1 = authId;
                
                console.log(
                    `%c[Account Switcher] SUCCESS: localStorage.${LOCAL_STORAGE_KEY} set.`, 
                    "color: #4CAF50; font-weight: bold;", 
                    `New value (first 10 chars): ${authId.substring(0, 10)}...`
                );
                
                // Prompt the user to reload using the account's friendly name
                promptForReload(name); 

                sendResponse({ success: true, message: "Local storage set." });
                
            } catch (e) {
                console.error("[Account Switcher] ERROR setting localStorage:", e);
                sendResponse({ 
                    success: false, 
                    message: `Failed to set localStorage: ${e.message}. The site might restrict script access.` 
                });
            }
            
            return true; // Indicates an asynchronous response
        }
    }
);
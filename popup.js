// Global state management
const ACCOUNT_STORAGE_KEY = 'authAccounts';

// DOM Elements
const accountListElement = document.getElementById('account-list');
const saveButton = document.getElementById('save-account');
const messageBox = document.getElementById('message-box');
const noAccountsMessage = document.getElementById('no-accounts');

/**
 * Utility to show temporary messages in the popup
 * @param {string} text The message to display
 */
function showMessage(text) {
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 2500);
}

/**
 * Loads accounts from chrome.storage.local
 * @returns {Promise<Object[]>} Array of accounts
 */
async function loadAccounts() {
    return new Promise(resolve => {
        // Using chrome.storage.local for persistent, secure storage within the extension
        chrome.storage.local.get(ACCOUNT_STORAGE_KEY, (result) => {
            resolve(result[ACCOUNT_STORAGE_KEY] || []);
        });
    });
}

/**
 * Saves the current list of accounts to chrome.storage.local
 * @param {Object[]} accounts The array of account objects
 */
async function saveAccounts(accounts) {
    return new Promise(resolve => {
        chrome.storage.local.set({ [ACCOUNT_STORAGE_KEY]: accounts }, () => {
            resolve();
        });
    });
}

/**
 * Renders the account list in the popup UI
 * @param {Object[]} accounts The array of account objects
 */
function renderAccounts(accounts) {
    accountListElement.innerHTML = '';
    
    if (accounts.length === 0) {
        noAccountsMessage.style.display = 'block';
        accountListElement.appendChild(noAccountsMessage);
        return;
    }
    // Ensure the 'No accounts' message is hidden if accounts exist
    if (document.contains(noAccountsMessage)) {
        noAccountsMessage.style.display = 'none';
    }


    accounts.forEach((account, index) => {
        const item = document.createElement('div');
        item.className = 'account-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'account-name';
        nameSpan.textContent = account.name;
        item.appendChild(nameSpan);

        const buttonGroup = document.createElement('div');

        const switchButton = document.createElement('button');
        switchButton.className = 'switch-btn';
        switchButton.textContent = 'Switch';
        switchButton.onclick = () => switchAccount(account);
        buttonGroup.appendChild(switchButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'X';
        deleteButton.onclick = () => deleteAccount(index);
        buttonGroup.appendChild(deleteButton);

        item.appendChild(buttonGroup);
        accountListElement.appendChild(item);
    });
}

/**
 * Handles saving a new account from the form
 */
saveButton.addEventListener('click', async () => {
    const nameInput = document.getElementById('account-name');
    const authIdInput = document.getElementById('auth-id');

    const name = nameInput.value.trim();
    const authId = authIdInput.value.trim();

    if (!name || !authId) {
        showMessage('Please provide both an Account Name and the Auth ID.');
        return;
    }

    const newAccount = {
        id: Date.now().toString(), // Simple unique ID
        name: name,
        authId: authId
    };

    const accounts = await loadAccounts();
    accounts.push(newAccount);
    await saveAccounts(accounts);
    renderAccounts(accounts);
    
    // Clear form inputs
    nameInput.value = '';
    authIdInput.value = '';
    showMessage(`Account "${name}" saved!`);
});

/**
 * Deletes an account at a specific index
 * @param {number} index The index of the account to delete
 */
async function deleteAccount(index) {
    let accounts = await loadAccounts();
    const accountName = accounts[index].name;
    accounts.splice(index, 1);
    await saveAccounts(accounts);
    renderAccounts(accounts);
    showMessage(`Account "${accountName}" deleted.`);
}

/**
 * Sends the selected account data (Auth ID and Name) to the content script for injection
 * @param {Object} account The account object to switch to
 */
async function switchAccount(account) {
    const { authId, name } = account; // Destructure both ID and Name

    // Get the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
        showMessage('Error: No active tab found.');
        return;
    }
    
    // Send a message containing the authId and name to the content script
    chrome.tabs.sendMessage(tab.id, {
        action: "SET_LOCAL_STORAGE_AUTH",
        payload: { authId, name } 
    }, (response) => {
        if (chrome.runtime.lastError) {
             showMessage(`Error: Could not communicate with page script. Try reloading the page first.`);
             console.error("Messaging error:", chrome.runtime.lastError.message);
        } else if (response && response.success) {
            // Content script handles the reload prompt, so we close the popup
            window.close(); 
        } else {
            showMessage(`Switch failed: ${response?.message || 'Script execution failed.'}`);
        }
    });
}

// Initialize the popup by loading and rendering accounts
document.addEventListener('DOMContentLoaded', async () => {
    const accounts = await loadAccounts();
    renderAccounts(accounts);
});
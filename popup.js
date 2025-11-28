// Global state management
const ACCOUNT_STORAGE_KEY = 'authAccounts';

// DOM Elements
const accountListElement = document.getElementById('account-list');
const saveButton = document.getElementById('save-account');
const messageBox = document.getElementById('message-box');
const noAccountsMessage = document.getElementById('no-accounts');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-modal-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const editAccountNameInput = document.getElementById('edit-account-name');
const editAuthIdInput = document.getElementById('edit-auth-id');
const editAccountId = document.getElementById('edit-account-id');


// --- Utility Functions ---

/** Utility to show temporary messages in the popup */
function showMessage(text) {
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 2500);
}

/** Loads accounts from chrome.storage.local */
async function loadAccounts() {
    return new Promise(resolve => {
        chrome.storage.local.get(ACCOUNT_STORAGE_KEY, (result) => {
            resolve(result[ACCOUNT_STORAGE_KEY] || []);
        });
    });
}

/** Saves the current list of accounts to chrome.storage.local */
async function saveAccounts(accounts) {
    return new Promise(resolve => {
        chrome.storage.local.set({ [ACCOUNT_STORAGE_KEY]: accounts }, () => {
            resolve();
        });
    });
}


// --- Account Management Functions ---

/** Renders the account list in the popup UI */
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
        buttonGroup.className = 'action-group';

        // EDIT BUTTON (GEAR ICON)
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        // Using a common gear/settings unicode character (⚙)
        editButton.innerHTML = '⚙'; 
        editButton.title = 'Edit Account';
        editButton.onclick = (e) => {
            e.stopPropagation(); // Prevent accidental background clicks
            openEditModal(account);
        };
        buttonGroup.appendChild(editButton);


        const switchButton = document.createElement('button');
        switchButton.className = 'switch-btn';
        switchButton.textContent = 'Switch';
        switchButton.onclick = () => switchAccount(account);
        buttonGroup.appendChild(switchButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'X';
        deleteButton.title = 'Delete Account';
        deleteButton.onclick = () => deleteAccount(index);
        buttonGroup.appendChild(deleteButton);

        item.appendChild(buttonGroup);
        accountListElement.appendChild(item);
    });
}

/** Handles saving a new account from the form */
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
        // Use a timestamp for a unique ID
        id: Date.now().toString(), 
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

/** Deletes an account at a specific index */
async function deleteAccount(index) {
    let accounts = await loadAccounts();
    const accountName = accounts[index].name;
    accounts.splice(index, 1);
    await saveAccounts(accounts);
    renderAccounts(accounts);
    showMessage(`Account "${accountName}" deleted.`);
}

/** Sends the selected account data to the content script for injection */
async function switchAccount(account) {
    const { authId, name } = account; 

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
            window.close(); 
        } else {
            showMessage(`Switch failed: ${response?.message || 'Script execution failed.'}`);
        }
    });
}


// --- Edit Modal Functions ---

/**
 * Opens the edit modal and populates it with account data.
 * @param {Object} account The account object to edit.
 */
function openEditModal(account) {
    editAccountId.value = account.id;
    editAccountNameInput.value = account.name;
    editAuthIdInput.value = account.authId;
    editModal.style.display = 'flex';
}

/** Closes the edit modal */
closeEditModalBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
});

/** Saves the changes from the edit modal */
saveEditBtn.addEventListener('click', async () => {
    const id = editAccountId.value;
    const newName = editAccountNameInput.value.trim();
    const newAuthId = editAuthIdInput.value.trim();

    if (!newName || !newAuthId) {
        showMessage('Name and Auth ID cannot be empty.', true);
        return;
    }

    let accounts = await loadAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);

    if (accountIndex !== -1) {
        const oldName = accounts[accountIndex].name;
        accounts[accountIndex].name = newName;
        accounts[accountIndex].authId = newAuthId;
        
        await saveAccounts(accounts);
        renderAccounts(accounts);
        editModal.style.display = 'none';
        showMessage(`Account "${oldName}" updated to "${newName}"!`);
    } else {
        showMessage('Error: Could not find account to update.', true);
        editModal.style.display = 'none';
    }
});


// --- Initialization ---

// Initialize the popup by loading and rendering accounts
document.addEventListener('DOMContentLoaded', async () => {
    const accounts = await loadAccounts();
    renderAccounts(accounts);
});

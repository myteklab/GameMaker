// ============================================
// UI - Toast Notifications
// ============================================
// Extracted from index.php lines 5065-5082

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;

    let className = 'show';
    if (type === 'error') className += ' error';
    else if (type === 'info') className += ' info';

    toast.className = className;

    setTimeout(() => {
        toast.className = '';
    }, 2500);
}

// ============================================
// UI - Confirm Modal
// ============================================
// Reusable confirmation modal to replace browser confirm()

function showConfirmModal(options) {
    const {
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmStyle = 'danger', // 'danger' (red) or 'primary' (purple)
        onConfirm = () => {},
        onCancel = () => {}
    } = options;

    // Create modal if it doesn't exist
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'confirm-modal-overlay';
        modal.innerHTML = `
            <div class="confirm-modal-content">
                <div class="confirm-modal-header">
                    <span class="confirm-modal-title"></span>
                </div>
                <div class="confirm-modal-body"></div>
                <div class="confirm-modal-footer">
                    <button class="confirm-modal-btn cancel"></button>
                    <button class="confirm-modal-btn confirm"></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideConfirmModal();
                if (modal._onCancel) modal._onCancel();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hideConfirmModal();
                if (modal._onCancel) modal._onCancel();
            }
        });
    }

    // Store callbacks
    modal._onConfirm = onConfirm;
    modal._onCancel = onCancel;

    // Update content
    modal.querySelector('.confirm-modal-title').textContent = title;
    modal.querySelector('.confirm-modal-body').innerHTML = message;

    const cancelBtn = modal.querySelector('.confirm-modal-btn.cancel');
    const confirmBtn = modal.querySelector('.confirm-modal-btn.confirm');

    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `confirm-modal-btn confirm ${confirmStyle}`;

    // Set up button handlers
    cancelBtn.onclick = () => {
        hideConfirmModal();
        onCancel();
    };

    confirmBtn.onclick = () => {
        hideConfirmModal();
        onConfirm();
    };

    // Show modal
    modal.classList.add('show');
    confirmBtn.focus();
}

function hideConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

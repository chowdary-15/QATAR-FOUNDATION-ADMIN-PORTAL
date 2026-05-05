// ============================================================
// Global state
// ============================================================
const captchas = { login: '', signup: '', forgot: '' };
let editingOppId = null; // null = create mode, number = edit mode

// ============================================================
// DOM INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Generate captchas
    ['login', 'signup', 'forgot'].forEach(type => generateCaptcha(type));

    // Check if already logged in (session persisted)
    checkSession();

    // Wire up forms
    initAuthForms();
    initOpportunityForm();
    initUIListeners();
});

// ============================================================
// SESSION CHECK — restore dashboard if session is active
// ============================================================
async function checkSession() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.authenticated) {
            showDashboard(data.admin.full_name, data.admin.email);
            loadOpportunities();
        }
    } catch (e) {
        // Not logged in or server not reachable — stay on auth page
    }
}

// ============================================================
// CAPTCHA
// ============================================================
function generateCaptcha(type) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    captchas[type] = code;
    const el = document.getElementById(type + 'CaptchaText');
    if (el) el.textContent = code;
}

// ============================================================
// TASK 1: AUTHENTICATION
// ============================================================
function initAuthForms() {

    // ── Login (US-1.2) ──────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearAllErrors('loginForm');

            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const captchaInput = document.getElementById('loginCaptchaInput').value.trim();
            const rememberEl   = document.querySelector('#loginForm .remember-me input[type="checkbox"]');
            const remember     = rememberEl ? rememberEl.checked : false;

            // Captcha check
            if (captchaInput !== captchas.login) {
                showError('loginCaptchaErr', 'Captcha does not match');
                generateCaptcha('login');
                document.getElementById('loginCaptchaInput').value = '';
                return;
            }

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password, remember })
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Login successful!');
                    showDashboard(data.admin.full_name, data.admin.email);
                    loadOpportunities();
                } else {
                    showError('loginPasswordErr', data.error || 'Invalid email or password');
                    shakeForm('loginForm');
                    generateCaptcha('login');
                    document.getElementById('loginCaptchaInput').value = '';
                }
            } catch (err) {
                showError('loginPasswordErr', 'Connection error. Please try again.');
                shakeForm('loginForm');
            }
        });
    }

    // ── Signup (US-1.1) ─────────────────────────────────────
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearAllErrors('signupForm');

            const name     = document.getElementById('signupName').value.trim();
            const email    = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirm  = document.getElementById('signupConfirmPassword').value;
            const captchaInput = document.getElementById('signupCaptchaInput').value.trim();

            // Client-side validation
            let hasError = false;
            if (!name) { showError('signupNameErr', 'Please enter your full name'); hasError = true; }
            if (!email || !isValidEmail(email)) { showError('signupEmailErr', 'Please enter a valid email address'); hasError = true; }
            if (password.length < 8) { showError('signupPasswordErr', 'Password must be at least 8 characters'); hasError = true; }
            if (password !== confirm) { showError('signupConfirmPasswordErr', 'Passwords do not match'); hasError = true; }
            if (captchaInput !== captchas.signup) {
                showError('signupCaptchaErr', 'Captcha does not match');
                generateCaptcha('signup');
                document.getElementById('signupCaptchaInput').value = '';
                hasError = true;
            }
            if (hasError) return;

            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name: name, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Account created successfully!');
                    setTimeout(() => showPage('loginPage'), 1500);
                    signupForm.reset();
                } else {
                    // Show error — most likely duplicate email
                    if (res.status === 409) {
                        showError('signupEmailErr', data.error || 'An account with this email already exists');
                    } else {
                        showToast(data.error || 'Signup failed. Please try again.');
                    }
                    shakeForm('signupForm');
                }
            } catch (err) {
                showToast('Connection error. Please try again.');
            }
        });
    }

    // ── Forgot Password (US-1.3) ────────────────────────────
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearAllErrors('forgotForm');

            const email = document.getElementById('forgotEmail').value.trim();
            const captchaInput = document.getElementById('forgotCaptchaInput').value.trim();

            if (!email || !isValidEmail(email)) {
                showError('forgotEmailErr', 'Please enter a valid email address');
                return;
            }
            if (captchaInput !== captchas.forgot) {
                showError('forgotCaptchaErr', 'Captcha does not match');
                generateCaptcha('forgot');
                document.getElementById('forgotCaptchaInput').value = '';
                return;
            }

            try {
                const res = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                // Always show the same success message (privacy protection)
                showToast('If this email is registered, a reset link has been sent.');
                forgotForm.reset();
                generateCaptcha('forgot');
                setTimeout(() => showPage('loginPage'), 3000);
            } catch (err) {
                showToast('Connection error. Please try again.');
            }
        });
    }
}

// ============================================================
// TASK 2: OPPORTUNITY MANAGEMENT
// ============================================================

// US-2.1 — Load and display all opportunities
async function loadOpportunities() {
    const grid = document.querySelector('.opportunities-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/opportunities', { credentials: 'include' });

        if (res.status === 401) {
            // Session expired — go back to login
            showAuthWrapper();
            return;
        }

        const opps = await res.json();
        renderOpportunities(opps);
    } catch (err) {
        console.error('Failed to load opportunities:', err);
    }
}

function renderOpportunities(opps) {
    const grid = document.querySelector('.opportunities-grid');
    if (!grid) return;

    // Clear existing cards (including hardcoded demo cards)
    grid.innerHTML = '';

    if (!opps || opps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px 20px;
                color: var(--qf-text-light);
            ">
                <svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:var(--qf-text-light);fill:none;stroke-width:1.5;margin-bottom:16px;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h4 style="font-size:18px;margin-bottom:8px;color:var(--qf-text);">No opportunities yet</h4>
                <p>Click "Add New Opportunity" to create your first one.</p>
            </div>`;
        return;
    }

    opps.forEach(opp => {
        const card = createOpportunityCard(opp);
        grid.appendChild(card);
    });
}

function createOpportunityCard(opp) {
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    card.dataset.id = opp.id;

    // Build skill tags HTML
    const skillsArr = (opp.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    const skillTagsHtml = skillsArr.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');

    card.innerHTML = `
        <div class="opportunity-card-header">
            <h5>${escapeHtml(opp.name)}</h5>
            <div class="opportunity-meta">
                <span>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${escapeHtml(opp.duration)}
                </span>
                <span>
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ${escapeHtml(opp.start_date)}
                </span>
            </div>
        </div>
        <p class="opportunity-description">${escapeHtml(opp.description)}</p>
        ${skillsArr.length > 0 ? `
        <div class="opportunity-skills">
            <div class="opportunity-skills-label">Skills You'll Gain</div>
            <div class="skills-tags">${skillTagsHtml}</div>
        </div>` : ''}
        <div class="opportunity-footer">
            <span class="applicants-count">${opp.max_applicants ? opp.max_applicants + ' max applicants' : escapeHtml(opp.category)}</span>
            <div style="display:flex;gap:8px;">
                <button
                    onclick="editOpportunity(${opp.id})"
                    style="background:none;border:1px solid var(--qf-green);color:var(--qf-green);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;">
                    Edit
                </button>
                <button
                    onclick="deleteOpportunity(${opp.id})"
                    style="background:none;border:1px solid var(--qf-red);color:var(--qf-red);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;">
                    Delete
                </button>
                <button
                    class="view-course-btn"
                    style="width:auto;padding:6px 14px;"
                    onclick="viewOpportunityDetails(${opp.id})">
                    View Details
                </button>
            </div>
        </div>`;
    return card;
}

// US-2.2 — Opportunity form (create + edit)
function initOpportunityForm() {
    const oppForm = document.getElementById('opportunityForm');
    if (!oppForm) return;

    oppForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name         = document.getElementById('oppName').value.trim();
        const duration     = document.getElementById('oppDuration').value.trim();
        const start_date   = document.getElementById('oppStartDate').value.trim();
        const description  = document.getElementById('oppDescription').value.trim();
        const skills       = document.getElementById('oppSkills').value.trim();
        const category     = document.getElementById('oppCategory').value.trim();
        const future_opps  = document.getElementById('oppFuture').value.trim();
        const max_raw      = document.getElementById('oppMaxApplicants').value.trim();
        const max_applicants = max_raw ? parseInt(max_raw, 10) : null;

        // Client-side required field check
        if (!name || !duration || !start_date || !description || !skills || !category || !future_opps) {
            showToast('Please fill in all required fields.');
            return;
        }

        const payload = { name, duration, start_date, description, skills, category, future_opps, max_applicants };

        const isEdit = editingOppId !== null;
        const url    = isEdit ? `/api/opportunities/${editingOppId}` : '/api/opportunities';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                showToast(isEdit ? 'Opportunity updated!' : 'Opportunity created!');
                closeOpportunityModal();
                loadOpportunities();
            } else {
                showToast(data.error || 'Failed to save opportunity.');
            }
        } catch (err) {
            showToast('Connection error. Please try again.');
        }
    });
}

// US-2.4 — View opportunity details
async function viewOpportunityDetails(id) {
    try {
        const res = await fetch(`/api/opportunities/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not found');
        const opp = await res.json();

        // Populate the existing opportunityDetailsModal in the HTML
        document.getElementById('opportunityDetailTitle').textContent = opp.name;
        document.getElementById('opportunityDetailDuration').textContent = opp.duration;

        // The HTML uses opportunityDetailStartDate (not opportunityDetailstart_date)
        const startDateEl = document.getElementById('opportunityDetailStartDate');
        if (startDateEl) startDateEl.textContent = opp.start_date;

        document.getElementById('opportunityDetailApplicants').textContent =
            opp.max_applicants ? opp.max_applicants : 'Not specified';
        document.getElementById('opportunityDetailDescription').textContent = opp.description;
        document.getElementById('opportunityDetailFuture').textContent = opp.future_opps;

        // Skills tags
        const skillsContainer = document.getElementById('opportunityDetailSkills');
        if (skillsContainer) {
            skillsContainer.innerHTML = '';
            (opp.skills || '').split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
                const span = document.createElement('span');
                span.className = 'skill-tag';
                span.textContent = skill;
                skillsContainer.appendChild(span);
            });
        }

        // Prerequisites field (not in our model — show category instead)
        const prereqEl = document.getElementById('opportunityDetailPrereqs');
        if (prereqEl) prereqEl.textContent = opp.category;

        document.getElementById('opportunityDetailsModal').classList.add('active');
    } catch (err) {
        showToast('Error loading opportunity details.');
        console.error(err);
    }
}

// US-2.5 — Edit opportunity (pre-fill form)
async function editOpportunity(id) {
    try {
        const res = await fetch(`/api/opportunities/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not found');
        const opp = await res.json();

        // Set edit mode
        editingOppId = id;

        // Update modal title
        const modalHeader = document.querySelector('#opportunityModal .modal-header h3');
        if (modalHeader) modalHeader.textContent = 'Edit Opportunity';

        const submitBtn = document.querySelector('#opportunityForm .btn-primary');
        if (submitBtn) submitBtn.textContent = 'Update Opportunity';

        // Pre-fill form fields
        document.getElementById('oppName').value        = opp.name || '';
        document.getElementById('oppDuration').value    = opp.duration || '';
        document.getElementById('oppStartDate').value   = opp.start_date || '';
        document.getElementById('oppDescription').value = opp.description || '';
        document.getElementById('oppSkills').value      = opp.skills || '';
        document.getElementById('oppCategory').value    = opp.category || '';
        document.getElementById('oppFuture').value      = opp.future_opps || '';
        document.getElementById('oppMaxApplicants').value = opp.max_applicants || '';

        openOpportunityModal();
    } catch (err) {
        showToast('Error loading opportunity for editing.');
        console.error(err);
    }
}

// US-2.6 — Delete opportunity
async function deleteOpportunity(id) {
    if (!confirm('Are you sure you want to permanently delete this opportunity? This action cannot be undone.')) {
        return;
    }

    try {
        const res = await fetch(`/api/opportunities/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.ok) {
            showToast('Opportunity deleted successfully.');
            loadOpportunities();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete opportunity.');
        }
    } catch (err) {
        showToast('Connection error. Please try again.');
    }
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openOpportunityModal() {
    document.getElementById('opportunityModal').classList.add('active');
}

function closeOpportunityModal() {
    document.getElementById('opportunityModal').classList.remove('active');

    // Reset to create mode
    editingOppId = null;
    const modalHeader = document.querySelector('#opportunityModal .modal-header h3');
    if (modalHeader) modalHeader.textContent = 'Add New Opportunity';
    const submitBtn = document.querySelector('#opportunityForm .btn-primary');
    if (submitBtn) submitBtn.textContent = 'Create Opportunity';

    document.getElementById('opportunityForm').reset();
}

function closeOpportunityDetailsModal() {
    document.getElementById('opportunityDetailsModal').classList.remove('active');
}

// ============================================================
// DASHBOARD HELPERS
// ============================================================
function showDashboard(fullName, email) {
    document.getElementById('authWrapper').style.display = 'none';
    document.getElementById('dashboardWrapper').classList.add('active');
    document.body.style.alignItems = 'stretch';

    // Set profile name and avatar
    const displayName = fullName || (email ? email.split('@')[0] : 'Admin');
    const nameEl = document.getElementById('dashName');
    if (nameEl) nameEl.textContent = displayName;

    const avatarEl = document.getElementById('dashAvatar');
    if (avatarEl) {
        const parts = displayName.trim().split(' ');
        const initials = parts.length >= 2
            ? parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase()
            : displayName.substring(0, 2).toUpperCase();
        avatarEl.textContent = initials;
    }
}

function showAuthWrapper() {
    document.getElementById('dashboardWrapper').classList.remove('active');
    document.getElementById('authWrapper').style.display = '';
    document.body.style.alignItems = '';
    showPage('loginPage');
}

function handleLogout() {
    fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .finally(() => {
            showToast('Signing out...');
            setTimeout(() => {
                showAuthWrapper();
            }, 1000);
        });
}

// ============================================================
// UI HELPERS
// ============================================================
function showPage(pageId) {
    document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        const span = el.querySelector('span');
        if (span && msg) span.textContent = msg;
        el.classList.add('show');
    }
}

function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
    form.querySelectorAll('input').forEach(i => i.classList.remove('error'));
}

function shakeForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 400);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function checkStrength(val) {
    const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const score = val.length < 8 ? 1 : val.length < 12 ? 2 : 4;
    const labelEl = document.getElementById('strengthLabel');
    if (labelEl) labelEl.textContent = val.length > 0 ? labels[score] : '';
}

// ============================================================
// SIDEBAR NAVIGATION & OTHER UI
// ============================================================
function initUIListeners() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const page = this.getAttribute('data-page');
            document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(page + 'Section');
            if (section) section.classList.add('active');
            const titleEl = document.getElementById('pageTitle');
            if (titleEl) titleEl.textContent = this.innerText.trim();

            // Load opportunities when switching to that tab
            if (page === 'opportunity') {
                loadOpportunities();
            }
        });
    });
}

function openSearch() {
    const sc = document.getElementById('searchContainer');
    if (sc) sc.classList.add('active');
    const si = document.getElementById('searchInput');
    if (si) si.focus();
}

function closeSearch() {
    const sc = document.getElementById('searchContainer');
    if (sc) sc.classList.remove('active');
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', current === 'dark' ? '' : 'dark');
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(item => item.classList.remove('unread'));
    const badge = document.querySelector('.notif-badge');
    if (badge) badge.style.display = 'none';
}

function changeChartPeriod(period) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// ============================================================
// COURSE / VERIFIER / COLLABORATOR MODALS (existing UI logic)
// ============================================================
function openCourseDetails(title, stats) {
    const modal = document.getElementById('courseModal');
    if (!modal) return;
    document.getElementById('modalCourseTitle').innerText = title;
    document.getElementById('modalEnrolled').innerText = stats.enrolled;
    document.getElementById('modalCompleted').innerText = stats.completed;
    document.getElementById('modalInProgress').innerText = stats.inProgress;
    document.getElementById('modalHalfDone').innerText = stats.halfDone;
    modal.classList.add('active');
}

function closeCourseModal() {
    const modal = document.getElementById('courseModal');
    if (modal) modal.classList.remove('active');
}

function openVerifierDetails(name, details) {
    const modal = document.getElementById('verifierDetailsModal');
    if (!modal) return;
    document.getElementById('verifierName').innerText = name;
    if (document.getElementById('verifierTotalStudents'))
        document.getElementById('verifierTotalStudents').innerText = details.totalStudents;
    if (document.getElementById('verifierCertified'))
        document.getElementById('verifierCertified').innerText = details.certified;
    modal.classList.add('active');
}

function closeVerifierDetailsModal() {
    const modal = document.getElementById('verifierDetailsModal');
    if (modal) modal.classList.remove('active');
}

function openCollaboratorCourses(name, role) {
    const modal = document.getElementById('collaboratorCoursesModal');
    if (!modal) return;
    document.getElementById('collaboratorName').innerText = name + "'s Submitted Courses";
    const roleEl = document.getElementById('collaboratorRole');
    if (roleEl) roleEl.innerText = role;
    modal.classList.add('active');
}

function closeCollaboratorCoursesModal() {
    const modal = document.getElementById('collaboratorCoursesModal');
    if (modal) modal.classList.remove('active');
}

function approveCourse(title) {
    showToast('Course "' + title + '" approved!');
}

function rejectCourse(title) {
    showToast('Course "' + title + '" rejected.');
}

function openQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    if (modal) modal.classList.add('active');
}

function closeQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    if (modal) modal.classList.remove('active');
}

function openBulkUploadModal() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) modal.classList.add('active');
}

function closeBulkUploadModal() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) modal.classList.remove('active');
}

function openQuickAddVerifierModal() {
    const modal = document.getElementById('quickAddVerifierModal');
    if (modal) modal.classList.add('active');
}

function closeQuickAddVerifierModal() {
    const modal = document.getElementById('quickAddVerifierModal');
    if (modal) modal.classList.remove('active');
}

function openBulkUploadVerifierModal() {
    const modal = document.getElementById('bulkUploadVerifierModal');
    if (modal) modal.classList.add('active');
}

function closeBulkUploadVerifierModal() {
    const modal = document.getElementById('bulkUploadVerifierModal');
    if (modal) modal.classList.remove('active');
}

function filterStudents() { /* placeholder */ }
function filterVerifiers() { /* placeholder */ }

function downloadSampleCSV() {
    const csv = 'First Name,Last Name,Email\nJohn,Doe,john.doe@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students_template.csv'; a.click();
    URL.revokeObjectURL(url);
}

function downloadSampleVerifierCSV() {
    const csv = 'First Name,Last Name,Email,Subject\nJane,Smith,jane.smith@example.com,Data Science';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'verifiers_template.csv'; a.click();
    URL.revokeObjectURL(url);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const el = document.getElementById('fileName');
    if (el && file) el.textContent = 'Selected: ' + file.name;
}

function handleVerifierFileSelect(event) {
    const file = event.target.files[0];
    const el = document.getElementById('verifierFileName');
    if (el && file) el.textContent = 'Selected: ' + file.name;
}

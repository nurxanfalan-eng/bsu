// Admin Panel Functionality

let isSuperAdmin = false;

// Admin Login
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            isSuperAdmin = data.isSuperAdmin;
            document.getElementById('adminLoginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
            
            // Show sub-admins tab only for super admin
            if (isSuperAdmin) {
                document.getElementById('subAdminsTab').style.display = 'flex';
            }
            
            loadAdminData();
        } else {
            alert(data.error || 'Giriş uğursuz oldu');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('Server xətası');
    }
});

// Load Admin Data
async function loadAdminData() {
    await loadSettings();
    await loadUsers();
    await loadReportedUsers();
    if (isSuperAdmin) {
        await loadSubAdmins();
    }
    updateStats();
}

// Load Settings
async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        const settings = await response.json();
        
        document.getElementById('rulesTextarea').value = settings.rules;
        document.getElementById('topicInput').value = settings.todayTopic;
        document.getElementById('filterWordsInput').value = settings.filterWords.join(', ');
        document.getElementById('groupExpiryInput').value = settings.messageExpiry.group;
        document.getElementById('privateExpiryInput').value = settings.messageExpiry.private;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.faculty}</td>
                <td>${user.degree}</td>
                <td>${user.course}</td>
                <td>
                    <span class="status-badge ${user.active ? 'active' : 'inactive'}">
                        ${user.active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td>
                    <button class="action-btn ${user.active ? 'deactivate' : 'activate'}" 
                            onclick="toggleUserStatus('${user.id}')">
                        ${user.active ? 'Deaktiv et' : 'Aktivləşdir'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load Reported Users
async function loadReportedUsers() {
    try {
        const response = await fetch('/api/admin/reported-users');
        const users = await response.json();
        
        const tbody = document.getElementById('reportedTableBody');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #999;">Şikayət edilən hesab yoxdur</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${user.faculty}</td>
                <td><strong>${user.reportCount}</strong></td>
                <td>
                    <button class="action-btn deactivate" 
                            onclick="toggleUserStatus('${user.id}')">
                        Deaktiv et
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading reported users:', error);
    }
}

// Load Sub Admins
async function loadSubAdmins() {
    try {
        const response = await fetch('/api/admin/sub-admins');
        const admins = await response.json();
        
        const tbody = document.getElementById('subAdminsTableBody');
        tbody.innerHTML = '';
        
        if (admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 24px; color: #999;">Alt admin yoxdur</td></tr>';
            return;
        }
        
        admins.forEach(admin => {
            const tr = document.createElement('tr');
            const createdDate = new Date(admin.createdAt).toLocaleDateString('az-AZ');
            tr.innerHTML = `
                <td>${admin.username}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="action-btn delete" 
                            onclick="deleteSubAdmin('${admin.id}')">
                        Sil
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading sub admins:', error);
    }
}

// Update Statistics
async function updateStats() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        
        const reportedResponse = await fetch('/api/admin/reported-users');
        const reportedUsers = await reportedResponse.json();
        
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.active).length;
        const reportedCount = reportedUsers.length;
        
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('reportedCount').textContent = reportedCount;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Toggle User Status
async function toggleUserStatus(userId) {
    if (!confirm('İstifadəçi statusunu dəyişmək istədiyinizdən əminsiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadUsers();
            await loadReportedUsers();
            updateStats();
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert('Server xətası');
    }
}

// Update Rules
async function updateRules() {
    const rules = document.getElementById('rulesTextarea').value;
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rules })
        });
        
        if (response.ok) {
            alert('Qaydalar yeniləndi');
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error updating rules:', error);
        alert('Server xətası');
    }
}

// Update Topic
async function updateTopic() {
    const todayTopic = document.getElementById('topicInput').value;
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ todayTopic })
        });
        
        if (response.ok) {
            alert('Günün mövzusu yeniləndi');
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error updating topic:', error);
        alert('Server xətası');
    }
}

// Update Filter Words
async function updateFilterWords() {
    const filterWordsStr = document.getElementById('filterWordsInput').value;
    const filterWords = filterWordsStr.split(',').map(w => w.trim()).filter(w => w);
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filterWords })
        });
        
        if (response.ok) {
            alert('Filtr sözləri yeniləndi');
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error updating filter words:', error);
        alert('Server xətası');
    }
}

// Update Message Expiry
async function updateMessageExpiry() {
    const group = parseInt(document.getElementById('groupExpiryInput').value);
    const private = parseInt(document.getElementById('privateExpiryInput').value);
    
    if (group < 1 || group > 168 || private < 1 || private > 168) {
        alert('Vaxt 1-168 saat aralığında olmalıdır');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messageExpiry: { group, private }
            })
        });
        
        if (response.ok) {
            alert('Mesaj silinmə vaxtı yeniləndi');
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error updating message expiry:', error);
        alert('Server xətası');
    }
}

// Create Sub Admin
async function createSubAdmin() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    
    if (!username || !password) {
        alert('İstifadəçi adı və şifrə daxil edin');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/sub-admins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Alt admin yaradıldı');
            document.getElementById('newAdminUsername').value = '';
            document.getElementById('newAdminPassword').value = '';
            loadSubAdmins();
        } else {
            alert(data.error || 'Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error creating sub admin:', error);
        alert('Server xətası');
    }
}

// Delete Sub Admin
async function deleteSubAdmin(adminId) {
    if (!confirm('Alt admini silmək istədiyinizdən əminsiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/sub-admins/${adminId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Alt admin silindi');
            loadSubAdmins();
        } else {
            alert('Xəta baş verdi');
        }
    } catch (error) {
        console.error('Error deleting sub admin:', error);
        alert('Server xətası');
    }
}

// Show Admin Tab
function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').style.display = 'block';
    
    // Add active class to clicked button
    event.target.closest('.tab-btn').classList.add('active');
}

// Admin Logout
function adminLogout() {
    document.getElementById('adminLoginScreen').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
    isSuperAdmin = false;
}

// Refactored adminDash.js - improved promote/demote reliability and event handling

document.addEventListener("DOMContentLoaded", () => {
    fetchCompetitions();

    const createForm = document.getElementById('createCompForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompetition();
        });
    }
});

// --- Helper Functions / map logic unchanged ---
let map;
let activeTarget = '';
var startMarker = null;
var finishMarker = null;

function toggleMap(target) {
    activeTarget = target;
    const mapElement = document.getElementById('mapSection');
    const modalBody = document.querySelector('.modal-body');

    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(mapElement);
    bsCollapse.show();

    mapElement.addEventListener('shown.bs.collapse', () => {
        if (map) map.invalidateSize();
        modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: 'smooth' });
    }, { once: true });

    if (!map) {
        map = L.map('mapCanvas').setView([39.5, -8.0], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        map.on('click', function (e) {
            const { lat, lng } = e.latlng;
            document.getElementById(activeTarget + 'Lat').value = lat.toFixed(6);
            document.getElementById(activeTarget + 'Lng').value = lng.toFixed(6);

            if (activeTarget === 'start') {
                if (startMarker) startMarker.setLatLng(e.latlng);
                else startMarker = L.marker(e.latlng, { icon: createIcon('green') }).addTo(map);
            } else {
                if (finishMarker) finishMarker.setLatLng(e.latlng);
                else finishMarker = L.marker(e.latlng, { icon: createIcon('red') }).addTo(map);
            }
        });
    }

    mapElement.addEventListener('shown.bs.collapse', () => {
        map.invalidateSize();
    }, { once: true });
}

function createIcon(color) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });
}

function showCreateForm() {
    const modalElement = document.getElementById('createCompetitionModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

async function saveCompetition() {
    const token = localStorage.getItem("token");
    const competitionData = {
        name: document.getElementById('compName').value,
        description: document.getElementById('copDesc').value,
        numberOfCompetitors: parseInt(document.getElementById('numParticipants').value),
        beginning: {
            Lat: parseFloat(document.getElementById('startLat').value),
            Lng: parseFloat(document.getElementById('startLng').value)
        },
        end: {
            Lat: parseFloat(document.getElementById('finishLat').value),
            Lng: parseFloat(document.getElementById('finishLng').value)
        },
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };

    try {
        const response = await fetch('/api/admin/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(competitionData)
        });

        if (response.ok) {
            alert("Sucesso!");
            const modalElement = document.getElementById('createCompetitionModal');
            bootstrap.Modal.getInstance(modalElement).hide();
            document.getElementById('createCompForm').reset();
            fetchCompetitions();
        } else {
            alert("Erro ao salvar dados.");
        }
    } catch (err) {
        console.error("Erro:", err);
    }
}

async function fetchCompetitions() {
    const token = localStorage.getItem("token");
    const tableBody = document.getElementById("competition-data");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/admin/competitions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        let html = "";
        if (!Array.isArray(data) || data.length === 0) {
            html += "<tr><td colspan='7' class='text-center'>Nenhuma corrida cadastrada.</td></tr>";
        } else {
            data.forEach(c => {
                html += `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.beginning.lat.toFixed(4)}, ${c.beginning.lng.toFixed(4)}</td>
                    <td>${c.end.lat.toFixed(4)}, ${c.end.lng.toFixed(4)}</td>
                    <td>${c.numberOfCompetitors}</td>
                    <td>${new Date(c.startTime).toLocaleDateString()}</td>
                    <td>${c.duration}</td>
                </tr>`;
            });
        }
        tableBody.innerHTML = html;
    } catch (err) {
        console.error("Erro ao carregar tabela:", err);
        if (err.message === "Unauthorized") {
            window.location.href = '/html/login.html';
        }
    }
}

// ----------------- Promotion / Demotion (refactored) -----------------
// Has a bug implement later
//// Utility: find row by exact data-user-id value
//function findRowByUserId(container, userId) {
//    const rows = container.querySelectorAll('tr[data-user-id]');
//    for (const r of rows) {
//        if (r.getAttribute('data-user-id') === userId) return r;
//    }
//    return null;
//}

//// Renders table and wires up event handlers using data attributes
//function renderUserTable(container, users) {
//    try {
//        if (!Array.isArray(users) || users.length === 0) {
//            container.innerHTML = `<div class="p-3">No users available.</div>`;
//            return;
//        }

//        let html = `<table class="table table-hover table-sm mb-0">
//                        <thead>
//                          <tr>
//                            <th>#</th>
//                            <th>Email</th>
//                            <th>Name</th>
//                            <th>Role</th>
//                            <th class="text-end">Action</th>
//                          </tr>
//                        </thead>
//                        <tbody>`;

//        users.forEach((u, idx) => {
//            const rawId = u.id ?? u.Id ?? '';
//            const id = String(rawId).replace(/"/g, '&quot;');
//            const email = (u.email ?? u.Email ?? u.userName ?? u.UserName) || '—';
//            const name = (u.name ?? u.Name) || '';
//            const role = u.role || (u.roles && u.roles.length ? u.roles[0] : 'User');

//            const actionHtml = role === 'Admin'
//                ? `<button type="button" class="btn btn-sm btn-outline-danger demote-btn" data-user-id="${id}">Demote</button>`
//                : `<button type="button" class="btn btn-sm btn-outline-success promote-btn" data-user-id="${id}">Promote</button>`;

//            html += `<tr data-user-id="${id}">
//                        <th scope="row">${idx + 1}</th>
//                        <td>${email}</td>
//                        <td>${name}</td>
//                        <td class="role-cell">${role}</td>
//                        <td class="text-end action-cell">${actionHtml}</td>
//                     </tr>`;
//        });

//        html += `</tbody></table>`;
//        container.innerHTML = html;

//        container.onclick = (e) => {
//            console.log("BAH-1")
//            const btn = e.target.closest('.promote-btn, .demote-btn');
//            if (!btn || btn.disabled) return;

//            const userId = btn.getAttribute('data-user-id');
//            btn.disabled = true; // Prevent double-clicks

//            if (btn.classList.contains('promote-btn')) {
//                promoteUser(userId, btn);
//            } else {
//                demoteUser(userId, btn);
//            }
//        };

//    } catch (err) {
//        console.error('Error rendering user table:', err);
//        container.innerHTML = `<div class="p-3 text-danger">Failed to render user list.</div>`;
//    }
//}

//async function PromoteUser() {
//    const token = localStorage.getItem("token");
//    if (!token) {
//        alert("You must be logged in as an admin.");
//        return;
//    }

//    try {
//        const [usersRes, adminsRes] = await Promise.all([
//            fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
//            fetch('/api/admin/admins', { headers: { 'Authorization': `Bearer ${token}` } })
//        ]);

//        if (!usersRes.ok || !adminsRes.ok) {
//            console.error("Failed to load user lists", usersRes.status, adminsRes.status);
//            alert("Failed to load users.");
//            return;
//        }

//        const nonAdmins = await usersRes.json();
//        const admins = await adminsRes.json();

//        // combine, marking roles explicitly
//        const normalized = [
//            ...nonAdmins.map(u => ({ id: u.id ?? u.Id, email: u.email ?? u.Email, name: u.name ?? u.Name, role: 'User' })),
//            ...admins.map(u => ({ id: u.id ?? u.Id, email: u.email ?? u.Email, name: u.name ?? u.Name, role: 'Admin' }))
//        ];
//        console.log(normalized);

//        const container = document.getElementById('promote-users-container');
//        renderUserTable(container, normalized);

//        const modalEl = document.getElementById('PromoteModal');
//        const modal = new bootstrap.Modal(modalEl);
//        modal.show();
//    } catch (err) {
//        console.error("Error fetching users:", err);
//        alert("Connection error while loading users.");
//    }
//}

//async function promoteUser(userId, btn) {
//    const token = localStorage.getItem("token");
//    const container = document.getElementById('promote-users-container');
//    try {
//        const response = await fetch(`/api/admin/promotion/${encodeURIComponent(userId)}`, {
//            method: 'POST',
//            headers: { 'Authorization': `Bearer ${token}` }
//        });

//        if (!response.ok) {
//            const text = await response.text();
//            alert("Promotion failed: " + text);
//            if (btn) btn.disabled = false;
//            return;
//        }

//        // Success: update row DOM (find by exact data attribute)
//        const row = findRowByUserId(container, userId);
//        if (row) {
//            row.classList.add('table-success');
//            const roleCell = row.querySelector('.role-cell');
//            const actionCell = row.querySelector('.action-cell');
//            if (roleCell) roleCell.textContent = 'Admin';
//            if (actionCell) {
//                actionCell.innerHTML = `<button type="button" class="btn btn-sm btn-outline-danger demote-btn" data-user-id="${userId}">Demote</button>`;
//                actionCell.querySelector('.demote-btn').addEventListener('click', (e) => {
//                    const b = e.currentTarget;
//                    b.disabled = true;
//                    demoteUser(userId, b);
//                });
//            }
//        }
//    } catch (err) {
//        console.error("Promotion error:", err);
//        alert("Connection error during promotion.");
//        if (btn) btn.disabled = false;
//    }
//}

//async function demoteUser(userId, btn) {
//    if (!confirm("Demote this admin to regular user?")) {
//        if (btn) btn.disabled = false;
//        return;
//    }
//    const token = localStorage.getItem("token");
//    const container = document.getElementById('promote-users-container');
//    try {
//        const response = await fetch(`/api/admin/demote/${encodeURIComponent(userId)}`, {
//            method: 'POST',
//            headers: { 'Authorization': `Bearer ${token}` }
//        });

//        console.log(response);  
//        if (!response.ok) {
//            const text = await response.text();
//            alert("Demotion failed: " + text);
//            if (btn) btn.disabled = false;
//            return;
//        }

//        // Success: update row DOM
//        const row = findRowByUserId(container, userId);
//        if (row) {
//            row.classList.add('table-warning');
//            const roleCell = row.querySelector('.role-cell');
//            const actionCell = row.querySelector('.action-cell');
//            if (roleCell) roleCell.textContent = 'User';
//            if (actionCell) {
//                actionCell.innerHTML = `<button type="button" class="btn btn-sm btn-outline-success promote-btn" data-user-id="${userId}">Promote</button>`;
//                actionCell.querySelector('.promote-btn').addEventListener('click', (e) => {
//                    const b = e.currentTarget;
//                    b.disabled = true;
//                    promoteUser(userId, b);
//                });
//            }
//        }
//    } catch (err) {
//        console.error("Demotion error:", err);
//        alert("Connection error during demotion.");
//        if (btn) btn.disabled = false;
//    }
//}
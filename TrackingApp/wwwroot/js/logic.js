document.addEventListener("DOMContentLoaded", async function () {
    // --- Map Initialization ---
    const map = L.map('map').setView([40.6405, -8.6538], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

    // routing control instance used to show competition path
    let routingControl = null;
    let runnerMarkers = [];

    // -- Auth UI logic 
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");

    // --- UI elements ---
    const competitionSelect = document.getElementById('competition-select');
    const runnersContainer = document.getElementById('runners-container');
    const runnersTableBody = document.getElementById('runners-table-body');
    const runnersEmpty = document.getElementById('runners-empty');
    const viewPathBtn = document.getElementById('view-path-btn');
    const refreshBtn = document.getElementById('refresh-runners');
    const clearMapBtn = document.getElementById('clear-map');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');

    // Auth logic
    if (token) {
        // User is logged in
        if (loginLink) loginLink.classList.add('d-none'); // Hide Sign In
        if (logoutBtn) logoutBtn.classList.remove('d-none'); // Show Logout

        // Check if user is Admin
        if (userRole === "Admin") {
            if (adminPanelBtn) adminPanelBtn.classList.remove('d-none'); // Show Admin Panel
        }
    } else {
        // User is NOT logged in
        if (loginLink) loginLink.classList.remove('d-none'); // Show Sign In
        if (logoutBtn) logoutBtn.classList.add('d-none'); // Hide Logout
        if (adminPanelBtn) adminPanelBtn.classList.add('d-none'); // Hide Admin Panel
    }

    // --- Logout Logic ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem("token");
            localStorage.removeItem("userRole");
            window.location.reload();
        });
    }

    // --- Admin Panel Redirection ---
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            window.location.href = './html/AdminDashboard.html';
        });
    }
    
    // --- Helpers ---

    // Helpers Variables
    let Allrunners = [];
    let currentPage = 1;
    const rowsPerPage = 15;


    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function clearRoute() {
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }
        runnerMarkers.forEach(m => map.removeLayer(m));
        runnerMarkers = [];
        const statsCard = document.getElementById('stats-card');
        if (statsCard) statsCard.style.display = 'none';
    }

    function renderRunners(page) {
        currentPage = page;
        runnersTableBody.innerHTML = '';

        if (!Allrunners || Allrunners.length === 0) {
            runnersContainer.style.display = 'none';
            runnersEmpty.style.display = 'block';
            runnersEmpty.textContent = 'No runners found for this competition.';
            document.getElementById('runners-pagination').style.display = 'none';
            return;
        }

        // 1. Calculate the slice for the current page
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        runnersName = Allrunners.map(r => r.name);
        const paginatedItems = runnersName.slice(start, end);

        // 2. Render only the items in this slice
        paginatedItems.forEach((name, idx) => {
            const tr = document.createElement('tr');
            // Calculate global ID based on page index
            const globalId = start + idx + 1;

            tr.innerHTML = `
            <th scope="row" class="text-center">${globalId}</th>
            <td class="text-center">${escapeHtml(name)}</td>`;
            runnersTableBody.appendChild(tr);
        });

        // 3. Update UI Visibility
        runnersEmpty.style.display = 'none';
        runnersContainer.style.display = 'block';
        document.getElementById('runners-pagination').style.display = 'block';

        // 4. Update Pagination Controls
        updatePaginationUI();
    }
    function updatePaginationUI() {
        const totalPages = Math.ceil(Allrunners.length / rowsPerPage);
        const infoLabel = document.getElementById('current-page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        infoLabel.textContent = `Page ${currentPage} of ${totalPages}`;

        // Disable buttons if at boundaries
        prevBtn.classList.toggle('disabled', currentPage === 1);
        nextBtn.classList.toggle('disabled', currentPage === totalPages || totalPages === 0);
    }

    // --- Event Listeners for Pagination Buttons ---
    document.getElementById('prev-page').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) renderRunners(currentPage - 1);
    });

    document.getElementById('next-page').addEventListener('click', (e) => {
        e.preventDefault();
        const totalPages = Math.ceil(Allrunners.length / rowsPerPage);
        if (currentPage < totalPages) renderRunners(currentPage + 1);
    });

    // Build and display a route on the map from two positions
    function showRouteFromPoints(startLatLng, endLatLng) {
        clearRoute();

        // 1. Define custom icons
        const startIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const endIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(startLatLng.lat, startLatLng.lng),
                L.latLng(endLatLng.lat, endLatLng.lng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'foot'
            }),
            lineOptions: {
                styles: [{ color: 'green', opacity: 0.8, weight: 6 }]
            },
            addWaypoints: false,
            show: false,
            // 2. Modified createMarker logic
            createMarker: function (i, waypoint, n) {
                if (i === 0) {
                    return L.marker(waypoint.latLng, { icon: startIcon }).bindPopup("Start");
                } else if (i === n - 1) {
                    return L.marker(waypoint.latLng, { icon: endIcon }).bindPopup("Finish");
                }
                return null;
            }
        }).addTo(map);

        // ... (rest of your routingControl.on('routesfound') and setTimeout logic)
        routingControl.on('routesfound', function (e) {
            const summary = e.routes[0].summary;
            const distanceKm = (summary.totalDistance / 1000).toFixed(2);
            const statsCard = document.getElementById('stats-card');
            const distanceVal = document.getElementById('distance-val');
            if (statsCard && distanceVal) {
                statsCard.style.display = 'block';
                distanceVal.innerText = distanceKm;
            }
        });

        setTimeout(() => {
            if (routingControl && routingControl.getPlan) {
                const wps = routingControl.getPlan().getWaypoints().map(w => w.latLng).filter(Boolean);
                if (wps.length) map.fitBounds(L.latLngBounds(wps), { padding: [40, 40] });
            }
        }, 800);
    }

    // --- Load public competitions for the select ---
    async function loadPublicCompetitions() {
        if (!competitionSelect) return;
        try {
            const res = await fetch('/api/public/choose_competitons');
            if (!res.ok) {
                competitionSelect.innerHTML = `<option value="">— Unable to load —</option>`;
                return;
            }
            const list = await res.json();
            populateCompetitionSelect(list);
        } catch (err) {
            console.error('Error loading competitions:', err);
            competitionSelect.innerHTML = `<option value="">— Error loading —</option>`;
        }
    }

    function populateCompetitionSelect(list) {
        if (!competitionSelect) return;
        if (!Array.isArray(list) || list.length === 0) {
            competitionSelect.innerHTML = `<option value="">— No competitions —</option>`;
            return;
        }
        let html = `<option value="">— Select Competition —</option>`;
        list.forEach(c => {
            const id = c.id ?? c.Id ?? '';
            const name = c.name ?? c.Name ?? `Competition ${id}`;
            html += `<option value="${escapeHtml(String(id))}">${escapeHtml(name)}</option>`;
        });
        competitionSelect.innerHTML = html;
    }

    // --- Fetch competition data (begin/end + runners) and update UI ---
    async function loadCompetitionData(compId) {
        if (!compId) return;
        try {
            const res = await fetch(`/api/public/competiton_data/?compId=${encodeURIComponent(compId)}`);
            if (!res.ok) {
                console.warn('Failed to load competition data', res.status);
                runnersEmpty.textContent = 'Competition data unavailable.';
                runnersEmpty.style.display = 'block';
                runnersContainer.style.display = 'none';
                clearRoute();
                return;
            }

            const data = await res.json();
      
            if (data == null) {
                runnersEmpty.textContent = 'No data returned.';
                runnersEmpty.style.display = 'block';
                runnersContainer.style.display = 'none';
                clearRoute();
                return;
            }

            let beg = null, end = null;
            const be = data.begEnd[0];
            if (be) {
                beg = { lat: be.beginningLat, lng: be.beginningLon };
                end = { lat: be.endLat, lng: be.endLon };
            }

           
           
            const rawRunners = data.runners;
            Allrunners = rawRunners.map(r => {
                const name = r.name;
                const point = { lat: r.lat, lng: r.lng };
                return { ...r, name, lat: point.lat, lng: point.lng };
            });

            

            // Show route if we have valid coordinates
            if (beg && end) {
                showRouteFromPoints(beg, end);

            } else {
                console.error("Coordinate data missing or invalid:", data.BegEnd, data.beginning, data.end);
                clearRoute();
            }
            renderRunners(1);

        } catch (err) {
            console.error('Error loading competition data', err);
            runnersEmpty.textContent = 'Error loading data (see console).';
            runnersEmpty.style.display = 'block';
            runnersContainer.style.display = 'none';
            clearRoute();
        }
    }

    // --- UI wiring ---
    if (competitionSelect) {
        competitionSelect.addEventListener('change', async () => {
            const id = competitionSelect.value;
            if (!id) {
                clearRoute();
                runnersTableBody.innerHTML = '';
                runnersContainer.style.display = 'none';
                runnersEmpty.style.display = 'block';
                runnersEmpty.textContent = 'Select a competition to load runners.';
                return;
            }
            // fetch and show competition data
            await loadCompetitionData(id);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const id = competitionSelect?.value;
            if (!id) return;
            await loadCompetitionData(id);
        });
    }

    if (viewPathBtn) {
        viewPathBtn.addEventListener('click', () => {
            if (!routingControl) return;
            const wps = routingControl.getPlan().getWaypoints().map(w => w.latLng).filter(Boolean);
            if (wps.length) map.fitBounds(L.latLngBounds(wps), { padding: [40, 40] });
        });
    }

    if (clearMapBtn) {
        clearMapBtn.addEventListener('click', () => {
            clearRoute();
            runnersTableBody.innerHTML = '';
            runnersContainer.style.display = 'none';
            runnersEmpty.style.display = 'block';
            runnersEmpty.textContent = 'Select a competition to load runners.';
        });
    }

    // initial load
    await loadPublicCompetitions();
});

// Helper function to find the closest point on the route polyline
function findNearestPointOnRoute(runnerLatLng, routeLatLngs) {
    let minDistance = Infinity;
    let closestPoint = runnerLatLng;

    for (let i = 0; i < routeLatLngs.length - 1; i++) {
        const p1 = routeLatLngs[i];
        const p2 = routeLatLngs[i + 1];

        // Leaflet helper to find the closest point on a line segment (p1-p2)
        const closestOnSegment = L.LineUtil.closestPointOnSegment(
            map.latLngToLayerPoint(runnerLatLng),
            map.latLngToLayerPoint(p1),
            map.latLngToLayerPoint(p2)
        );

        const snappedLatLng = map.layerPointToLatLng(closestOnSegment);
        const distance = runnerLatLng.distanceTo(snappedLatLng);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = snappedLatLng;
        }
    }
    return closestPoint;
}
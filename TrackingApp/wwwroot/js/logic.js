document.addEventListener("DOMContentLoaded", async function () {
    // --- Map Initialization ---
    const map = L.map('map').setView([40.6405, -8.6538], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

    // routing control instance used to show competition path
    let routingControl = null;
    let runnerMarkers = [];

    // --- UI elements ---
    const competitionSelect = document.getElementById('competition-select');
    const runnersContainer = document.getElementById('runners-container');
    const runnersTableBody = document.getElementById('runners-table-body');
    const runnersEmpty = document.getElementById('runners-empty');
    const viewPathBtn = document.getElementById('view-path-btn');
    const refreshBtn = document.getElementById('refresh-runners');
    const clearMapBtn = document.getElementById('clear-map');

    // --- Helpers ---
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

    function renderRunners(runners) {
        runnersTableBody.innerHTML = '';
        if (!Array.isArray(runners) || runners.length === 0) {
            runnersContainer.style.display = 'none';
            runnersEmpty.style.display = 'block';
            runnersEmpty.textContent = 'No runners found for this competition.';
            return;
        }

        runners.forEach((nome, idx) => {
            const name = nome;
            const tr = document.createElement('tr');

            // Both cells now have text-center to align with the header
            tr.innerHTML = `
                <th scope="row" class="text-center">${idx + 1}</th>
                <td class="text-center">${escapeHtml(name)}</td>`;
            runnersTableBody.appendChild(tr);
        });
      

        runnersEmpty.style.display = 'none';
        runnersContainer.style.display = 'block';
    }

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

           
            let runners = [];
            const rawRunners = data.runners;
            runners = rawRunners.map(r => {
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
            renderRunners(runners.map(r => r.name));
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
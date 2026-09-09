// Initialize Map focused on India
const map = L.map('map').setView([20.5937, 78.9629], 5);

// Add Base Tile Layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  attribution: 'Tiles &copy; Esri'
});

// Set default layer to satellite
satelliteLayer.addTo(map);

// Add layer switch control
L.control.layers({ "Satellite": satelliteLayer, "Street Map": osmLayer }).addTo(map);

// Sample Fire Hotspots Data (Replace/expand with your API or live JSON)
const hotspots = [
  {
    id: "HOTSPOT-101",
    state: "Telangana",
    lat: 17.3850,
    lng: 78.4867,
    frp: "45.2 MW",
    confidence: "88%",
    imageUrl: "https://images.unsplash.com/photo-1579403124614-197f69d8187b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "HOTSPOT-102",
    state: "Uttarakhand",
    lat: 30.0668,
    lng: 79.0193,
    frp: "112.8 MW",
    confidence: "95%",
    imageUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "HOTSPOT-103",
    state: "Maharashtra",
    lat: 19.0760,
    lng: 72.8777,
    frp: "31.0 MW",
    confidence: "74%",
    imageUrl: "https://images.unsplash.com/photo-1599578705716-8d3d9224f33d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "HOTSPOT-104",
    state: "Andhra Pradesh",
    lat: 16.5062,
    lng: 80.6480,
    frp: "67.4 MW",
    confidence: "91%",
    imageUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "HOTSPOT-105",
    state: "Himachal Pradesh",
    lat: 31.1048,
    lng: 77.1734,
    frp: "88.1 MW",
    confidence: "85%",
    imageUrl: "https://images.unsplash.com/photo-1579403124614-197f69d8187b?auto=format&fit=crop&w=600&q=80"
  }
];

let activeMarkers = [];

// Custom Flame Marker Icon
const fireIcon = L.divIcon({
  className: 'custom-fire-marker',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #ef4444;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Function to render markers based on selected state
function renderHotspots(selectedState) {
  // Clear existing markers
  activeMarkers.forEach(marker => map.removeLayer(marker));
  activeMarkers = [];

  // Filter logic
  const filteredData = selectedState === "ALL" 
    ? hotspots 
    : hotspots.filter(item => item.state === selectedState);

  // Update Active Counter UI
  document.getElementById('totalHotspotsCount').innerText = filteredData.length;

  // Render Markers
  filteredData.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lng], { icon: fireIcon }).addTo(map);

    const popupHTML = `
      <div class="hotspot-popup">
        <h3>${spot.id}</h3>
        <p><strong>State:</strong> ${spot.state}</p>
        <p><strong>FRP:</strong> ${spot.frp}</p>
        <p><strong>Confidence:</strong> ${spot.confidence}</p>
        <p><strong>Coordinates:</strong> ${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</p>
        <div class="img-container">
          <span>Live Satellite Capture:</span>
          <a href="${spot.imageUrl}" target="_blank">
            <img src="${spot.imageUrl}" alt="Live Fire Image" class="live-fire-img" title="Click to view full image" />
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHTML);
    activeMarkers.push(marker);
  });

  // Zoom to visible markers if a specific state is selected
  if (selectedState !== "ALL" && activeMarkers.length > 0) {
    const group = new L.featureGroup(activeMarkers);
    map.fitBounds(group.getBounds().pad(0.3));
  }
}

// Event listener for State filter dropdown
document.getElementById('stateFilter').addEventListener('change', (e) => {
  renderHotspots(e.target.value);
});

// Initial Population
renderHotspots("ALL");
// script.js
document.addEventListener('DOMContentLoaded', function () {
  // --- CONFIGURATION ---
  const ORS_API_KEY = '5b3ce3597851110001cf624829cc851193c34d00a0b57558dc02624f';
  const CACHE_VERSION = 'v3.2-all-routes-visible'; // New cache version
  const DEFAULT_ROUTE_COLOR = '#007bff'; // Blue
  const ACTIVE_ROUTE_COLOR = '#FF0000'; // Red
  // --- END CONFIGURATION ---

  if (ORS_API_KEY === 'YOUR_OPENROUTESERVICE_API_KEY' && ORS_API_KEY.length === 30) {
      console.error('API Key Missing. Please update ORS_API_KEY in script.js');
      document.getElementById('loading-indicator').textContent = 'API Key Missing.';
      return;
  }

  const map = L.map('map').setView([39.5, -5.0], 6);
  const itineraryListElement = document.getElementById('itinerary-list');
  const loadingIndicator = document.getElementById('loading-indicator');
  const clearCacheButton = document.getElementById('clear-cache-button');
  const mapTypeSelector = document.getElementById('map-type');
  
  const homeButton = document.getElementById('home-button');
  const prevItemButton = document.getElementById('prev-item-button');
  const nextItemButton = document.getElementById('next-item-button');

  const panelContentArea = document.getElementById('panel-content-area');
  const itineraryListContainer = document.getElementById('itinerary-list-container');
  const itemDetailsSection = document.getElementById('item-details-section');
  
  const cityInfoView = document.getElementById('city-info-view');
  const routeInfoView = document.getElementById('route-info-view');

  const activeCityNameElement = document.getElementById('active-city-name');
  const cityStayDatesElement = document.getElementById('city-stay-dates');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const activeRouteDescriptionElement = document.getElementById('active-route-description');
  const routeTravelDateElement = document.getElementById('route-travel-date');
  const routeDepartureCityElement = document.getElementById('route-departure-city');
  const routeDepartureTimeElement = document.getElementById('route-departure-time');
  const routeArrivalCityElement = document.getElementById('route-arrival-city');
  const routeArrivalTimeElement = document.getElementById('route-arrival-time');
  const routeTravelDurationElement = document.getElementById('route-travel-duration');
  const routeNotesContainer = document.getElementById('route-notes-container');
  const routeNotesTextElement = document.getElementById('route-notes-text');

  let routeFeatureGroup = L.featureGroup().addTo(map); // Will hold ALL route polylines
  let cityMarkersGroup = L.featureGroup().addTo(map);
  let currentTileLayer = null;
  let combinedItinerary = [];
  let currentItineraryIndex = -1; 
  let allRoutePolylines = {}; // Store all polyline objects: { "route-definition-id": polylineLayer }


  // --- Map Tile Layers ---
  const tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, etc.'
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 19
      })
  };
  function setMapTileLayer(type) {
      if (currentTileLayer) map.removeLayer(currentTileLayer);
      currentTileLayer = tileLayers[type] || tileLayers.osm;
      currentTileLayer.addTo(map);
  }
  setMapTileLayer('osm');
  mapTypeSelector.addEventListener('change', (e) => setMapTileLayer(e.target.value));

  // --- Cache Management ---
  function clearLocalStorageRoutes() {
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`route_${CACHE_VERSION}_`) || key.startsWith('route_') || key === 'routeCacheVersion') {
              localStorage.removeItem(key);
          }
      });
      console.log('All relevant route caches cleared.');
  }
  const storedCacheVersion = localStorage.getItem('routeCacheVersion');
  if (storedCacheVersion !== CACHE_VERSION) {
      clearLocalStorageRoutes();
      localStorage.setItem('routeCacheVersion', CACHE_VERSION);
      console.log('Cache version updated. Old caches cleared.');
  }

  // --- City and Route Data ---
   const cityDetailsData = {
      lisbon: {
        name: "Lisbon",
        stayDates: "Oct 24 - Oct 28, 2025", 
        coords: [-9.1393, 38.7223],
        sights: ["Alfama District & São Jorge Castle", "Baixa District (Praça do Comércio)", "Livraria Bertrand", "Bairro Alto & Príncipe Real", "Belém Tower & Jerónimos Monastery", "LX Factory", "Miradouros", "MAAT"],
        mustDos: ["Dinner at Lovely Castelo", "Sunset cocktails at Topo Chiado", "Fado at A Tasca do Chico", "Pastel-de-Nata class", "Ride Tram 28 early"],
        activities: ["Tagus sunset sailing", "Street-art bike safari", "Lisbon Beer Bike Tour", "Ribeira das Naus swim deck"],
        foodToEat: ["Pastéis de Nata", "Bacalhau à Brás", "Sardinhas Assadas (seasonal)", "Bifana", "Ginjinha", "Caracois (seasonal)"],
        restaurantsBars: ["Lovely Castelo", "O Velho Eurico", "Taberna da Rua das Flores", "Prado", "Topo Chiado", "Pavilhão Chinês", "Mama Shelter Rooftop", "Quimera Brewpub"],
        tips: ["Lisboa Card: weigh options", "Pickpockets on Tram 28", "Refuse rosemary scam", "Hills are steep, use funiculars", "Silence during Fado, tipping customary"]
      },
      porto: {
        name: "Porto",
        stayDates: "Oct 28 - Oct 29, 2025", 
        coords: [-8.6291, 41.1579],
        sights: ["São Bento Station", "Clérigos Tower", "Livraria Lello", "Porto Cathedral", "Palácio da Bolsa", "Igreja de São Francisco", "Dom Luís I Bridge", "Foz do Douro sunset"],
        mustDos: ["Port-wine cellar tour", "Francesinha at Café Santiago", "Ribeira riverside wander", "Sunset beer at Jardim do Morro", "Azulejo spotting Rua das Flores"],
        activities: ["Arrábida Bridge climb", "Saturday gallery crawl Rua Miguel Bombarda", "Craft-beer hop", "Mercado do Bolhão tasting"],
        foodToEat: ["Francesinha", "Tripas à Moda do Porto", "Bolinhos de Bacalhau", "Sandes de Pernil", "Cachorrinho", "Matosinhos grilled seafood", "Ovos Moles"],
        restaurantsBars: ["Adega São Nicolau", "Capela Incomum", "Casa do Livro", "Maus Hábitos rooftop", "Letraria Brewpub"],
        tips: ["Limit cellar tastings", "Livraria Lello: pre-book", "Grippy shoes needed", "Ribeira restaurants can be pricey", "Andante 24-hr pass"]
      },
      caceres: {
        name: "Caceres",
        stayDates: "Oct 29, 2025 (Stopover)", 
        coords: [-6.3722, 39.4764],
        sights: ["Plaza Mayor", "Arco de la Estrella", "Torre de Bujaco", "Concatedral de Santa María", "Palacio de los Golfines de Abajo", "Museo de Cáceres"],
        mustDos: ["Game-of-Thrones selfie", "Golden-hour climb Torre de Bujaco", "Evening vino on Plaza Mayor"],
        activities: ["Medieval loop walk", "GoT location hunt", "Jamón-&-cheese shopping"],
        foodToEat: ["Torta del Casar toastie", "Jamón Ibérico", "Migas Extremeñas", "Perrunillas", "Veal cheek at Atrio**"],
        restaurantsBars: ["La Minerva", "La Cacharrería", "Atrio Restaurante Hotel", "Espacio & Café Bar Corregidor"],
        tips: ["Old Town is pedestrian", "Plaza Mayor cafés terrace surcharge", "Weekend wedding photo sessions"]
      },
      merida: {
        name: "Merida",
        stayDates: "Oct 29, 2025 (Stopover)", 
        coords: [-6.3437, 38.9158],
        sights: ["Roman Theatre & Amphitheatre", "National Museum of Roman Art", "Temple of Diana", "Alcazaba", "Roman Bridge", "Aqueduct of Los Milagros", "Casa del Mitreo", "Crypt of Basilica Santa Eulalia"],
        mustDos: ["Evening light-up Roman Theatre", "Cross Roman Bridge", "Museum + Theatre combo ticket", "Tapas crawl Calle Sagasta"],
        activities: ["Chariot-race VR", "Kayak under Lusitania Bridge", "Sunset photo Aqueduct"],
        foodToEat: ["Free tapas Calle Sagasta", "Cochifrito Extremeño", "Ibores DOP goat cheese", "Pitarra wines"],
        restaurantsBars: ["Mercado Gastronómico San Albín", "El Puchero de la Nieta", "La Bodeguilla de Almeda"],
        tips: ["Historic-site pass €17", "Sites close early in winter", "Summer theatre festival sells out"]
      },
      seville: {
        name: "Seville",
        stayDates: "Oct 29 - Nov 01, 2025", 
        coords: [-5.9845, 37.3891],
        sights: ["Real Alcázar", "Seville Cathedral & La Giralda", "Barrio Santa Cruz", "Plaza de España", "Metropol Parasol", "Triana Bridge"],
        mustDos: ["Alcázar gardens early", "Climb La Giralda", "Flamenco in Triana", "Triana sunset tapeo", "Rowboat Plaza de España"],
        activities: ["Guadalquivir kayak", "Ceramics workshop", "Early-morning churros"],
        foodToEat: ["Espinacas con Garbanzos", "Cola de Toro", "Salmorejo", "Orange wine"],
        restaurantsBars: ["El Rinconcillo", "Bodega Santa Cruz", "Vega 10", "Sol y Sombra", "La Terraza del EME"],
        tips: ["Rosemary sprigs scam", "Book Alcázar/Cathedral online", "Tapas not free", "Respect flamenco silence"]
      },
      cadiz: {
        name: "Cadiz",
        stayDates: "Nov 01 - Nov 03, 2025",
        coords: [-6.2926, 36.5298],
        sights: ["Cádiz Cathedral & Torre de Poniente", "Torre Tavira", "Barrio del Pópulo", "Roman Theatre", "Castillo de San Sebastián", "La Caleta Beach", "Mercado Central"],
        mustDos: ["La Viña seafood binge", "Sunset on Paseo Fernando Quiñones", "Oyster shooters in Mercado"],
        activities: ["Bike coastal greenway", "Surf lesson", "Carnaval costume shop"],
        foodToEat: ["Tortillitas de Camarones", "Atún de Almadraba (seasonal)", "Chicharrones", "Papas con Chocos"],
        restaurantsBars: ["Taberna Casa Manteca", "El Faro de Cádiz", "La Candela", "La Tapería de Columela", "La Isla del León rooftop"],
        tips: ["Torre Tavira timed slot", "Swim shoes for La Caleta", "Carnaval (Feb) hikes prices"]
      },
      ronda: {
        name: "Ronda",
        stayDates: "Nov 03 - Nov 04, 2025", 
        coords: [-5.1642, 36.7376],
        sights: ["Puente Nuevo", "El Tajo Gorge", "Plaza de Toros", "Old Town (La Ciudad)", "Arab Baths", "Casa del Rey Moro", "Mirador de Aldehuela"],
        mustDos: ["Blue-hour shots Puente Nuevo", "Bullring visit", "Wine flight Bodega Descalzos Viejos"],
        activities: ["Camino de los Molinos hike", "Canyoning Cueva del Gato (seasonal)", "Stargazing El Tajo"],
        foodToEat: ["Rabo de Toro", "Payoyo goat cheese", "Wild-mushroom revuelto", "Almendra frita ice-cream"],
        restaurantsBars: ["Restaurante Tragata", "Bardal** Michelin", "De Locos Tapas", "Parador de Ronda terrace"],
        tips: ["Parking fills early", "Bridge viewpoints steep", "Overnight for empty streets"]
      },
      setenil_de_las_bodegas: {
        name: "Setenil de las Bodegas",
        stayDates: "Nov 04, 2025 (Day Trip)",
        coords: [-5.1795, 36.8645],
        sights: ["Calle Cuevas del Sol", "Calle Cuevas de la Sombra", "Castillo de Setenil", "Rock-overhang houses"],
        mustDos: ["Coffee under cave-roof", "Castle-top panorama"],
        activities: ["Tapas crawl cave streets", "Olive-oil shop tastings"],
        foodToEat: ["Chorizo al vino", "Local olive-oil toast", "Masitas pastries"],
        restaurantsBars: ["La Tasca", "Bar La Escueva", "Restaurante Domingos"],
        tips: ["Approach from Alcalá del Valle", "Park at top", "Weekends can be crowded"]
      },
      malaga: {
        name: "Malaga",
        stayDates: "Nov 04 - Nov 06, 2025", 
        coords: [-4.4214, 36.7213],
        sights: ["Alcazaba", "Castillo de Gibralfaro", "Picasso Museum", "Roman Theatre", "Muelle Uno", "Catedral", "Pedregalejo quarter"],
        mustDos: ["Espetos at El Tintero", "Sunset mojito La Terraza de la Alcazaba", "Street-art tour Soho"],
        activities: ["Hammam Al Ándalus", "Rooftop-hop", "Caminito del Rey day trip"],
        foodToEat: ["Fritura Malagueña", "Ajoblanco", "Gambas al Pil-Pil", "Porra Antequerana", "Tarta Malagueña"],
        restaurantsBars: ["El Pimpi", "Casa Lola", "Kaleja*", "La Terraza del Quizás"],
        tips: ["Gibralfaro hike shaded late", "Book Picasso Museum online", "Bike lanes to Pedregalejo"]
      },
      granada: {
        name: "Granada",
        stayDates: "Nov 06 - Nov 09, 2025",
        coords: [-3.5986, 37.1773],
        sights: ["Alhambra & Generalife", "Albaicín quarter", "Sacromonte cave district", "Granada Cathedral", "Mirador de San Nicolás"],
        mustDos: ["Pre-dawn Alhambra", "Free-tapa crawl Calle Navas", "Flamenco zambra", "Tea at Tetería Nazari"],
        activities: ["Hammam Al Ándalus", "Arab-spice shopping", "Sierra Nevadas day-ski (seasonal)"],
        foodToEat: ["Habas con Jamón", "Piononos", "Tortilla del Sacromonte", "Remojón Granadino"],
        restaurantsBars: ["Bar Los Diamantes", "Bodegas Castañeda", "El Bar de Fede", "Bar Poe", "La Tana"],
        tips: ["Official Alhambra tickets essential", "Order drink for free tapa", "Mirador de San Nicolás busy, try alternatives"]
      },
      cordoba: {
        name: "Cordoba",
        stayDates: "Nov 09 - Nov 11, 2025", 
        coords: [-4.7794, 37.8882],
        sights: ["Mezquita-Catedral", "Alcázar de los Reyes Cristianos", "Jewish Quarter & Synagogue", "Puente Romano", "Palacio de Viana", "Medina Azahara"],
        mustDos: ["Early Mezquita visit", "Evening Alcázar light show", "Patios Festival (May)", "Feria de Córdoba (late May)"],
        activities: ["Horse show Royal Stables", "Bike Puente Romano", "Flamenco tavern hop"],
        foodToEat: ["Salmorejo Cordobés", "Flamenquín", "Berenjenas con Miel", "Rabo de Toro", "Pastel Cordobés"],
        restaurantsBars: ["Bodegas Campos", "Taberna Salinas", "Casa Pepe de la Judería", "Mercado Victoria", "Taberna El Gallo"],
        tips: ["Mezquita dress-code", "Summer highs 40°C, tour early/late", "Feria dates vary"]
      },
      toledo: {
        name: "Toledo",
        stayDates: "Nov 11, 2025 (Stopover)", 
        coords: [-4.0273, 39.8628],
        sights: ["Toledo Cathedral", "Alcázar of Toledo", "Monasterio de San Juan de los Reyes", "Synagogue of Santa María la Blanca", "Mirador del Valle"],
        mustDos: ["Walk the old town", "See El Greco's 'Burial of the Count of Orgaz'"],
        activities: ["Zipline across the Tagus River (seasonal)", "Marzipan tasting"],
        foodToEat: ["Marzipan", "Carcamusas", "Manchego cheese"],
        restaurantsBars: ["Restaurante Adolfo (splurge)", "Cervecería El Trébol (tapas)"],
        tips: ["Wear comfortable shoes", "Can be very crowded", "Consider a guided tour for history"]
      },
      madrid: {
        name: "Madrid",
        stayDates: "Nov 11 - Nov 17, 2025", 
        coords: [-3.7038, 40.4168],
        sights: ["Prado Museum", "Retiro Park & Crystal Palace", "Royal Palace & Almudena Cathedral", "Reina Sofía (Guernica)", "Gran Vía"],
        mustDos: ["Museum tri-fecta", "Picnic rowboat Retiro", "Sunday Rastro market + La Latina tapas"],
        activities: ["Bernabéu Stadium tour", "Flamenco at Cardamomo", "Malasaña bar-hop"],
        foodToEat: ["Bocadillo de Calamares", "Churros con Chocolate", "Cocido Madrileño"],
        restaurantsBars: ["Casa Camacho", "1862 Dry Bar", "Toma Café", "Sala Equis", "Angelita", "Azotea del Círculo de Bellas Artes"],
        tips: ["Dinner service late", "Metro runs till 01:30, night buses available", "Pickpockets in Malasaña & Chueca"]
      }
  };
  const routeDefinitionData = [ 
      { id: "lisbon-porto", date: "28/10/2025", startLocation: "Lisbon", endLocation: "Porto", departureTime: "9:30 AM", notes: "Travel to Porto.", waypoints: [] },
      { id: "porto-caceres", date: "29/10/2025", startLocation: "Porto", endLocation: "Caceres", departureTime: "10:00 AM", notes: "Drive to Caceres.", waypoints: [] },
      { id: "caceres-merida", date: "29/10/2025", startLocation: "Caceres", endLocation: "Merida", departureTime: "5:00 PM", notes: "Drive to Merida after Caceres stop.", waypoints: [] },
      { id: "merida-seville", date: "29/10/2025", startLocation: "Merida", endLocation: "Seville", departureTime: "8:30 PM", notes: "Drive to Seville after Merida stop.", waypoints: [] },
      { id: "seville-cadiz", date: "01/11/2025", startLocation: "Seville", endLocation: "Cadiz", departureTime: "10:00 AM", notes: "Coastal drive.", waypoints: [] },
      { id: "cadiz-ronda", date: "03/11/2025", startLocation: "Cadiz", endLocation: "Ronda", departureTime: "11:00 AM", notes: "Scenic route via Zahara de la Sierra.", waypoints: [[-5.3925, 36.8398]] },
      { id: "ronda-setenil", date: "04/11/2025", startLocation: "Ronda", endLocation: "Setenil de las Bodegas", departureTime: "9:00 AM", notes: "Day trip to Setenil.", waypoints: [] },
      { id: "setenil-ronda", date: "04/11/2025", startLocation: "Setenil de las Bodegas", endLocation: "Ronda", departureTime: "1:00 PM", notes: "Return from Setenil.", waypoints: [] },
      { id: "ronda-malaga", date: "04/11/2025", startLocation: "Ronda", endLocation: "Malaga", departureTime: "4:00 PM", notes: "To Malaga after Setenil.", waypoints: [] },
      { id: "malaga-granada", date: "06/11/2025", startLocation: "Malaga", endLocation: "Granada", departureTime: "1:00 PM", notes: "Direct route.", waypoints: [] },
      { id: "granada-cordoba", date: "09/11/2025", startLocation: "Granada", endLocation: "Cordoba", departureTime: "2:00 PM", notes: "To Cordoba.", waypoints: [] },
      { id: "cordoba-toledo", date: "11/11/2025", startLocation: "Cordoba", endLocation: "Toledo", departureTime: "10:00 AM", notes: "Drive to Toledo.", waypoints: [] },
      { id: "toledo-madrid", date: "11/11/2025", startLocation: "Toledo", endLocation: "Madrid", departureTime: "5:30 PM", notes: "Drive to Madrid after Toledo stop.", waypoints: [] }
  ];

  const defaultMarkerIcon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

  // --- Helper Functions ---
  function formatDuration(seconds) {
      if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
  }
  function calculateArrivalTime(departureTimeStr, durationSeconds) {
      if (!departureTimeStr || durationSeconds === undefined || durationSeconds === null || isNaN(durationSeconds)) return 'N/A';
      const timeParts = departureTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) { console.warn("Could not parse departure time:", departureTimeStr); return 'N/A'; }
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const departureDate = new Date(); 
      departureDate.setHours(hours, minutes, 0, 0);
      const arrivalDate = new Date(departureDate.getTime() + durationSeconds * 1000);
      let arrivalHours = arrivalDate.getHours();
      const arrivalMinutes = arrivalDate.getMinutes();
      const arrivalAmpm = arrivalHours >= 12 ? 'PM' : 'AM';
      arrivalHours = arrivalHours % 12;
      arrivalHours = arrivalHours ? arrivalHours : 12;
      return `${arrivalHours}:${arrivalMinutes.toString().padStart(2, '0')} ${arrivalAmpm}`;
  }
  function getCityId(cityName) {
      return cityName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
  }

  // --- Itinerary Generation ---
  function generateCombinedItinerary() {
      combinedItinerary = [];
      if (routeDefinitionData.length === 0) return;

      const firstCityId = getCityId(routeDefinitionData[0].startLocation);
      if (cityDetailsData[firstCityId]) {
          combinedItinerary.push({
              type: 'city',
              id: `city-${firstCityId}-0`, 
              cityId: firstCityId,
              name: cityDetailsData[firstCityId].name,
              date: cityDetailsData[firstCityId].stayDates.split(' - ')[0],
              data: cityDetailsData[firstCityId]
          });
      }

      routeDefinitionData.forEach((route, routeIndex) => {
          const startCityId = getCityId(route.startLocation); 
          const endCityId = getCityId(route.endLocation);   

          if (cityDetailsData[startCityId] && cityDetailsData[endCityId]) {
              combinedItinerary.push({
                  type: 'route',
                  id: `route-${route.id}`, // This is the ID from routeDefinitionData e.g. "lisbon-porto"
                  routeDefinitionId: route.id, // Keep original ID for polyline mapping
                  name: `${route.startLocation} to ${route.endLocation}`,
                  date: route.date, 
                  data: { // This 'data' holds the specific route segment for display
                      ...route,
                      startCoords: cityDetailsData[startCityId].coords,
                      endCoords: cityDetailsData[endCityId].coords
                  }
              });
          }

          if (cityDetailsData[endCityId]) {
              const lastItineraryItem = combinedItinerary[combinedItinerary.length -1];
              if(!(lastItineraryItem && lastItineraryItem.type === 'city' && lastItineraryItem.cityId === endCityId && lastItineraryItem.date === cityDetailsData[endCityId].stayDates.split(' - ')[0])) {
                   // Check if the city is a "stopover" or a multi-day stay to assign date correctly
                  let displayDate = cityDetailsData[endCityId].stayDates.split(' - ')[0];
                  if (cityDetailsData[endCityId].stayDates.toLowerCase().includes("stopover") || cityDetailsData[endCityId].stayDates.toLowerCase().includes("day trip")) {
                      displayDate = route.date; // For stopovers, use the travel date
                  }

                  combinedItinerary.push({
                      type: 'city',
                      id: `city-${endCityId}-${routeIndex + 1}`, 
                      cityId: endCityId,
                      name: cityDetailsData[endCityId].name,
                      date: displayDate, 
                      data: cityDetailsData[endCityId]
                  });
              }
          }
      });
      console.log("Generated Itinerary:", combinedItinerary);
  }

  // --- UI Population and Interaction ---
  function populateItineraryList() {
      itineraryListElement.innerHTML = '';
      if (combinedItinerary.length === 0) {
          itineraryListElement.innerHTML = '<p>No itinerary items to display.</p>';
          return;
      }
      combinedItinerary.forEach((item, index) => {
          const itemDiv = document.createElement('div');
          itemDiv.classList.add('itinerary-item', item.type === 'city' ? 'city-item' : 'route-item');
          itemDiv.dataset.index = index;

          const icon = document.createElement('i');
          icon.classList.add('fas', item.type === 'city' ? 'fa-city' : 'fa-route');
          
          const titleSpan = document.createElement('span');
          titleSpan.classList.add('item-title');
          titleSpan.textContent = item.name;

          const dateSpan = document.createElement('span');
          dateSpan.classList.add('item-date');
          dateSpan.textContent = item.date; 

          itemDiv.appendChild(icon);
          itemDiv.appendChild(titleSpan);
          itemDiv.appendChild(dateSpan);

          itemDiv.addEventListener('click', () => {
              setCurrentItineraryItem(index);
          });
          itineraryListElement.appendChild(itemDiv);
      });
  }

  function setCurrentItineraryItem(index, fromButton = false) {
      if (index < 0 || index >= combinedItinerary.length) {
          showFullItineraryList(); 
          return;
      }
      currentItineraryIndex = index;
      const item = combinedItinerary[index];

      document.querySelectorAll('.itinerary-item.active').forEach(el => el.classList.remove('active'));
      const listItem = itineraryListElement.querySelector(`.itinerary-item[data-index="${index}"]`);
      if (listItem) {
          listItem.classList.add('active');
          if(!fromButton && itineraryListContainer.classList.contains('hidden')) { // Only scroll if list is not the main view
               // This might not be needed if list is hidden when details are shown
          }
      }
      displayItemDetails(item);
      updateNavButtonVisibility();
  }

  function styleAllRoutesDefault() {
      Object.values(allRoutePolylines).forEach(polyline => {
          if (polyline) { // Check if polyline exists
              polyline.setStyle({
                  color: DEFAULT_ROUTE_COLOR,
                  weight: 5,
                  opacity: 0.65 // Slightly less prominent
              });
          }
      });
  }

  async function displayItemDetails(item) {
      // Always ensure all routes are styled default first
      styleAllRoutesDefault();
      cityMarkersGroup.eachLayer(marker => marker.setOpacity(0.7).closePopup());

      itineraryListContainer.classList.add('hidden'); 
      itemDetailsSection.classList.remove('hidden');
      panelContentArea.scrollTop = 0; 

      if (item.type === 'city') {
          cityInfoView.classList.remove('hidden');
          routeInfoView.classList.add('hidden');
          
          const cityData = item.data;
          activeCityNameElement.textContent = cityData.name;
          cityStayDatesElement.textContent = cityData.stayDates || 'N/A';

          populateTabContent('sights', cityData.sights);
          populateTabContent('must-dos', cityData.mustDos);
          populateTabContent('activities', cityData.activities);
          populateTabContent('food', cityData.foodToEat);
          populateTabContent('restaurants-bars', cityData.restaurantsBars);
          populateTabContent('tips', cityData.tips);

          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabPanes.forEach(pane => pane.classList.remove('active'));
          if (tabButtons.length > 0) tabButtons[0].classList.add('active');
          if (tabPanes.length > 0) tabPanes[0].classList.add('active');

          const cityMarker = findCityMarker(item.cityId);
          if (cityMarker) {
              map.setView(cityMarker.getLatLng(), 13);
              cityMarker.setOpacity(1).openPopup();
          } else if (cityData.coords) {
              map.setView([cityData.coords[1], cityData.coords[0]], 13); 
          }

      } else if (item.type === 'route') {
          routeInfoView.classList.remove('hidden');
          cityInfoView.classList.add('hidden');
          
          const routeSegDisplayData = item.data; // This is from combinedItinerary, includes start/end Coords etc.
          const routeDefId = item.routeDefinitionId; // Original ID like "lisbon-porto"

          activeRouteDescriptionElement.textContent = item.name;
          routeTravelDateElement.textContent = routeSegDisplayData.date;
          routeDepartureCityElement.textContent = routeSegDisplayData.startLocation;
          routeDepartureTimeElement.textContent = routeSegDisplayData.departureTime;
          routeArrivalCityElement.textContent = routeSegDisplayData.endLocation;
          
          const orsRouteDetails = await fetchOrsRouteDetails(routeDefinitionData.find(rd => rd.id === routeDefId)); 
          
          routeTravelDurationElement.textContent = formatDuration(orsRouteDetails.duration);
          routeArrivalTimeElement.textContent = calculateArrivalTime(routeSegDisplayData.departureTime, orsRouteDetails.duration);
          
          if(routeSegDisplayData.notes && routeSegDisplayData.notes.trim() !== "") {
              routeNotesTextElement.textContent = routeSegDisplayData.notes;
              routeNotesContainer.classList.remove('hidden');
          } else {
              routeNotesContainer.classList.add('hidden');
          }

          const activePolyline = allRoutePolylines[routeDefId];
          if (activePolyline) {
              activePolyline.setStyle({ color: ACTIVE_ROUTE_COLOR, weight: 7, opacity: 1 }).bringToFront();
              map.fitBounds(activePolyline.getBounds(), {padding: [50,50]});
          } else {
              // If polyline wasn't created/found (should not happen if init is correct)
              // Fallback to drawing it now, though ideally it's pre-drawn
              if (orsRouteDetails.geometry && orsRouteDetails.geometry.length > 0) {
                  const polyline = L.polyline(orsRouteDetails.geometry, { color: ACTIVE_ROUTE_COLOR, weight: 7, opacity: 1 }).addTo(routeFeatureGroup);
                  allRoutePolylines[routeDefId] = polyline; // Store it if newly created
                  map.fitBounds(polyline.getBounds(), {padding: [50,50]});
              }
          }
          
          const startCityMarker = findCityMarker(getCityId(routeSegDisplayData.startLocation));
          const endCityMarker = findCityMarker(getCityId(routeSegDisplayData.endLocation));
          if(startCityMarker) startCityMarker.setOpacity(1);
          if(endCityMarker) endCityMarker.setOpacity(1);
      }
  }
  
  function findCityMarker(cityIdToFind) {
      let foundMarker = null;
      cityMarkersGroup.eachLayer(marker => {
          if (marker.options && marker.options.cityId === cityIdToFind) {
              foundMarker = marker;
          }
      });
      return foundMarker;
  }

  function showFullItineraryList() {
      itemDetailsSection.classList.add('hidden');
      itineraryListContainer.classList.remove('hidden');
      currentItineraryIndex = -1; 
      document.querySelectorAll('.itinerary-item.active').forEach(el => el.classList.remove('active'));
      
      styleAllRoutesDefault(); // Make all routes blue
      cityMarkersGroup.eachLayer(marker => marker.setOpacity(1).closePopup()); 
      
      if (routeFeatureGroup.getLayers().length > 0) {
          map.fitBounds(routeFeatureGroup.getBounds(), {padding: [30,30]});
      } else if (cityMarkersGroup.getLayers().length > 0) {
           map.fitBounds(cityMarkersGroup.getBounds(), {padding: [30,30]});
      }
      updateNavButtonVisibility();
  }

  function updateNavButtonVisibility() {
      const isDetailsView = !itemDetailsSection.classList.contains('hidden');
      
      homeButton.classList.toggle('hidden', !isDetailsView);
      prevItemButton.classList.toggle('hidden', !isDetailsView);
      nextItemButton.classList.toggle('hidden', !isDetailsView);

      if (isDetailsView) {
          prevItemButton.disabled = currentItineraryIndex <= 0;
          nextItemButton.disabled = currentItineraryIndex >= combinedItinerary.length - 1;
      }
  }
  
  homeButton.addEventListener('click', showFullItineraryList);

  prevItemButton.addEventListener('click', () => {
      if (currentItineraryIndex > 0) {
          setCurrentItineraryItem(currentItineraryIndex - 1, true);
      }
  });

  nextItemButton.addEventListener('click', () => {
      if (currentItineraryIndex < combinedItinerary.length - 1) {
          setCurrentItineraryItem(currentItineraryIndex + 1, true);
      }
  });
  
  async function fetchOrsRouteDetails(routeDefSegment) { // Expects a segment from routeDefinitionData
      if (!routeDefSegment || !routeDefSegment.id) {
          console.error("Invalid routeDefSegment passed to fetchOrsRouteDetails", routeDefSegment);
          return { geometry: [], duration: null, distance: null };
      }
      const cacheKey = `route_${CACHE_VERSION}_${routeDefSegment.id}`; 
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
          try { return JSON.parse(cachedData); }
          catch (e) { localStorage.removeItem(cacheKey); }
      }
      
      const startCityData = cityDetailsData[getCityId(routeDefSegment.startLocation)];
      const endCityData = cityDetailsData[getCityId(routeDefSegment.endLocation)];

      if (!startCityData || !startCityData.coords || !endCityData || !endCityData.coords) {
          console.error("Missing coordinates for route:", routeDefSegment.id);
          return { geometry: [], duration: null, distance: null }; 
      }

      const startCoords = startCityData.coords;
      const endCoords = endCityData.coords;
      const waypoints = routeDefSegment.waypoints || [];

      const coordinates = [startCoords, ...waypoints, endCoords];
      const body = JSON.stringify({ coordinates: coordinates });

      try {
          const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
              method: 'POST',
              headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json, application/geo+json' },
              body: body
          });
          if (!response.ok) {
              const errData = await response.json().catch(() => ({error: {message: "Unknown API error"}}));
              throw new Error(`ORS API Error: ${response.status} ${errData.error?.message}`);
          }
          const data = await response.json();
          if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              const routeDetails = {
                  geometry: feature.geometry.coordinates.map(c => [c[1], c[0]]), 
                  duration: feature.properties.summary?.duration,
                  distance: feature.properties.summary?.distance
              };
              localStorage.setItem(cacheKey, JSON.stringify(routeDetails));
              return routeDetails;
          } else { throw new Error('No route features from ORS.'); }
      } catch (error) {
          console.error(`Error fetching ORS details for ${routeDefSegment.id}:`, error);
          const fallbackGeometry = [ [startCoords[1], startCoords[0]], [endCoords[1], endCoords[0]] ];
          if (waypoints.length > 0) { 
              const midWaypoints = waypoints.map(wp => [wp[1], wp[0]]);
              fallbackGeometry.splice(1,0, ...midWaypoints);
          }
          return { geometry: fallbackGeometry, duration: null, distance: null }; 
      }
  }

  tabButtons.forEach(button => {
      button.addEventListener('click', () => {
          const targetTab = button.dataset.tab;
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `${targetTab}-content`));
      });
  });
  function populateTabContent(tabId, dataArray) {
      const contentDiv = document.getElementById(`${tabId}-content`);
      if (!contentDiv) return;
      contentDiv.innerHTML = '';
      if (dataArray && dataArray.length > 0) {
          const ul = document.createElement('ul');
          dataArray.forEach(item => {
              const li = document.createElement('li');
              li.innerHTML = typeof item === 'string' ? item : (item.name ? `<strong>${item.name}</strong>${item.description ? `: ${item.description}` : ''}` : 'Invalid format');
              ul.appendChild(li);
          });
          contentDiv.appendChild(ul);
      } else {
          contentDiv.innerHTML = '<p>No specific information available.</p>';
      }
  }

  // --- Initialization ---
  async function initializeApp() {
      loadingIndicator.classList.remove('hidden');
      loadingIndicator.textContent = "Loading Itinerary Data...";

      generateCombinedItinerary();
      populateItineraryList();
      
      cityMarkersGroup.clearLayers(); // Clear before re-adding
      Object.values(cityDetailsData).forEach(city => {
          if (city.coords) {
              const marker = L.marker([city.coords[1], city.coords[0]], {icon: defaultMarkerIcon, cityId: getCityId(city.name)}) 
                             .bindPopup(`<b>${city.name}</b><br>${city.stayDates}`)
                             .on('click', () => {
                                 // Try to find the *first* city item in itinerary for this cityId
                                 const cityItineraryIndex = combinedItinerary.findIndex(item => item.type === 'city' && item.cityId === getCityId(city.name));
                                 if (cityItineraryIndex !== -1) {
                                     setCurrentItineraryItem(cityItineraryIndex);
                                 } else { 
                                     // Fallback if not in main itinerary list (e.g. a waypoint not explicitly a "stay")
                                     // This might not be ideal as it doesn't set currentItineraryIndex
                                     displayItemDetails({ type: 'city', name: city.name, data: city, cityId: getCityId(city.name) });
                                     updateNavButtonVisibility(); // Ensure buttons are hidden for this "adhoc" view
                                 }
                             });
              cityMarkersGroup.addLayer(marker);
          }
      });
      
      loadingIndicator.textContent = "Fetching route details (0%)...";
      routeFeatureGroup.clearLayers(); // Clear existing polylines before re-adding
      allRoutePolylines = {}; // Reset storage

      const totalRoutesToFetch = routeDefinitionData.length;
      let routesFetchedCount = 0;

      for (const routeDef of routeDefinitionData) {
          const orsRouteDetails = await fetchOrsRouteDetails(routeDef);
          if (orsRouteDetails.geometry && orsRouteDetails.geometry.length > 0) {
              const polyline = L.polyline(orsRouteDetails.geometry, {
                  color: DEFAULT_ROUTE_COLOR,
                  weight: 5,
                  opacity: 0.65
              });
              polyline.addTo(routeFeatureGroup); // Add to the main group
              allRoutePolylines[routeDef.id] = polyline; // Store it
          }
          routesFetchedCount++;
          loadingIndicator.textContent = `Fetching route details (${Math.round((routesFetchedCount / totalRoutesToFetch) * 100)}%)...`;
      }
      
      showFullItineraryList(); 
      loadingIndicator.classList.add('hidden');
  }

  clearCacheButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the route cache and reload all routes? This will use API credits.')) {
          clearLocalStorageRoutes();
          localStorage.setItem('routeCacheVersion', CACHE_VERSION);
          console.log('Cache cleared. Re-initializing app...');
          allRoutePolylines = {}; 
          initializeApp(); 
      }
  });

  initializeApp();
});

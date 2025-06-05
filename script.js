// script.js
document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIGURATION ---
    const ORS_API_KEY = '5b3ce3597851110001cf624829cc851193c34d00a0b57558dc02624f';
    const CACHE_VERSION = 'v1.4-route-city-update-debug2'; // Incremented cache version
    // --- END CONFIGURATION ---

    if (ORS_API_KEY === 'YOUR_OPENROUTESERVICE_API_KEY') {
        alert('Please replace "YOUR_OPENROUTESERVICE_API_KEY" with your actual OpenRouteService API key in script.js');
        document.getElementById('loading-indicator').textContent = 'API Key Missing. Please update script.js.';
        return;
    }

    const map = L.map('map').setView([39.5, -5.0], 6);
    const routeListElement = document.getElementById('route-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const clearCacheButton = document.getElementById('clear-cache-button');
    const infoPanelTitle = document.getElementById('info-panel-title'); // Updated ID
    const routeInfoSection = document.getElementById('route-info-section');
    const cityDetailsSection = document.getElementById('city-details-section');
    const noCitySelectedDiv = document.getElementById('no-city-selected');
    const backToRoutesButton = document.getElementById('back-to-routes-button');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    let routeFeatureGroup = L.featureGroup().addTo(map);
    let cityMarkersGroup = L.featureGroup().addTo(map);

    function clearLocalStorageRoutes() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`route_${CACHE_VERSION}_`) || key.startsWith('route_') || key === 'routeCacheVersion') {
                localStorage.removeItem(key);
            }
        });
        console.log('All relevant route caches cleared from localStorage.');
    }

    const storedCacheVersion = localStorage.getItem('routeCacheVersion');
    if (storedCacheVersion !== CACHE_VERSION) {
        clearLocalStorageRoutes();
        localStorage.setItem('routeCacheVersion', CACHE_VERSION);
        console.log('Route cache version updated/set. Old caches might have been cleared.');
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let routeLayers = [];
    let activeRouteLayer = null;
    let cityDataMarkers = {};

    const cityDetailsData = {
        lisbon: {
          name: "Lisbon",
          sights: [
            "Alfama District & São Jorge Castle",
            "Baixa District (Praça do Comércio)",
            "Livraria Bertrand (Oldest Bookstore)",
            "Bairro Alto & Príncipe Real",
            "Belém Tower & Jerónimos Monastery",
            "LX Factory (Creative Hub)",
            "Miradouros: Senhora do Monte, Graça, Miradouro da Rocha do Conde de Óbidos",
            "MAAT riverside contemporary-art complex"
          ],
          mustDos: [
            "Dinner at Lovely Castelo inside the castle walls (reserve sunset slot)",
            "Sunset cocktails at Topo Chiado rooftop",
            "Authentic Fado at A Tasca do Chico",
            "DIY Pastel-de-Nata class in Mouraria",
            "Ride vintage Tram 28 early morning to dodge pickpockets"
          ],
          activities: [
            "Tagus sunset sailing (Doca de Santo Amaro)",
            "Street-art bike safari in Marvila",
            "Lisbon Beer Bike Tour (Belém)",
            "Ribeira das Naus riverfront swim deck"
          ],
          foodToEat: [
            "Pastéis de Nata",
            "Bacalhau à Brás / Pastéis de Bacalhau",
            "Sardinhas Assadas (June festivals)",
            "Bifana at O Trevo",
            "Ginjinha (A Ginjinha Espinheira)",
            "Caracois (summer snails)"
          ],
          restaurantsBars: [
            "Lovely Castelo (fine dining with castle views)",
            "O Velho Eurico (modern tasca)",
            "Taberna da Rua das Flores",
            "Prado (farm-to-table)",
            "Topo Chiado & Javá Rooftop (skyline views)",
            "Pavilhão Chinês (curio cocktail bar)",
            "Mama Shelter Rooftop (DJ nights)",
            "Quimera Brewpub (inside an aqueduct arch)"
          ],
          tips: [
            "Lisboa Card: weigh against youth / student discounts.",
            "Pickpockets frequent Tram 28—ride off-peak or sit by driver.",
            "Refuse rosemary-bracelet scam near Sé & Castelo.",
            "Hills are brutal—use funiculars; CityMapper covers them.",
            "Silence during Fado; tipping singers is customary."
          ]
        },
      
        porto: {
          name: "Porto",
          sights: [
            "São Bento Azulejo Station",
            "Clérigos Tower (night view tickets)",
            "Livraria Lello (timed entry)",
            "Porto Cathedral & cloister",
            "Palácio da Bolsa Arab Room",
            "Igreja de São Francisco",
            "Dom Luís I Bridge (upper deck walk)",
            "Atlantic sunset at Foz do Douro"
          ],
          mustDos: [
            "Port-wine cellar tour (Graham's, Taylor’s, Kopke 1638)",
            "Francesinha at Café Santiago (or Brasão)",
            "Ribeira riverside wander",
            "Sunset beer at Jardim do Morro",
            "Azulejo spotting on Rua das Flores"
          ],
          activities: [
            "Arrábida Bridge climb",
            "Saturday gallery crawl Rua Miguel Bombarda",
            "Craft-beer hop: Letraria, Catraio, Armazém da Cerveja",
            "Mercado do Bolhão produce tasting"
          ],
          foodToEat: [
            "Francesinha",
            "Tripas à Moda do Porto",
            "Bolinhos de Bacalhau",
            "Sandes de Pernil (Casa Guedes)",
            "Cachorrinho (Gazela)",
            "Matosinhos grilled seafood",
            "Ovos Moles from neighboring Aveiro (day-trip snack)"
          ],
          restaurantsBars: [
            "Adega São Nicolau (riverside tasca)",
            "Capela Incomum (bar in a chapel)",
            "Casa do Livro (cocktails among first-editions)",
            "Maus Hábitos rooftop",
            "Letraria Brewpub (16 taps)",
            "Cervejaria Capitão (experimental pours)",
            "Gare Club (techno after-hours)"
          ],
          tips: [
            "Two cellar tastings per day max keeps palette sane.",
            "Livraria Lello: pre-book + arrive 09:00.",
            "Wear grippy shoes—steep polished granite.",
            "Ribeira restaurants = premium tourist pricing; cross to Gaia for value.",
            "Metro Andante 24-hr pass often cheaper than singles."
          ]
        },
      
        caceres: {
          name: "Cáceres",
          sights: [
            "Plaza Mayor",
            "Arco de la Estrella gateway",
            "Torre de Bujaco (panorama)",
            "Concatedral de Santa María",
            "Palacio de los Golfines de Abajo",
            "Museo de Cáceres & Moorish cistern"
          ],
          mustDos: [
            "Game-of-Thrones selfie under Arco de la Estrella",
            "Golden-hour climb of Torre de Bujaco",
            "Evening vino on Plaza Mayor arcade"
          ],
          activities: [
            "1-hour medieval loop walk",
            "GoT location scavenger hunt",
            "Jamón-&-cheese shopping at Mercado San Francisco"
          ],
          foodToEat: [
            "Torta del Casar toastie",
            "Jamón Ibérico Dehesa de Extremadura",
            "Migas Extremeñas",
            "Perrunillas cookies",
            "Veal cheek at Atrio** (2-Michelin-star splurge)"
          ],
          restaurantsBars: [
            "La Minerva (creative tapas)",
            "La Cacharrería (cheap raciones, plaza-view)",
            "Atrio Restaurante Hotel (fine dining with 380-page wine list)",
            "Espacio & Café Bar Corregidor (local haunt)"
          ],
          tips: [
            "Old Town is pedestrian; use Obispo Galarza car park.",
            "Plaza Mayor cafés add terrace surcharge—check menu.",
            "Weekends see local wedding photo sessions—fun to watch."
          ]
        },
      
        merida: {
          name: "Mérida",
          sights: [
            "Roman Theatre & Amphitheatre",
            "National Museum of Roman Art",
            "Temple of Diana",
            "Alcazaba & cistern",
            "Roman Bridge",
            "Aqueduct of Los Milagros",
            "Casa del Mitreo mosaics",
            "Crypt of Basilica Santa Eulalia"
          ],
          mustDos: [
            "Evening light-up at Roman Theatre",
            "Cross the 792-m Roman Bridge",
            "Museum + Theatre combo ticket",
            "Tapas crawl Calle Sagasta"
          ],
          activities: [
            "Chariot-race VR at Roman Circus visitor centre",
            "Kayak under the Lusitania Bridge",
            "Sunset photo of Aqueduct arches"
          ],
          foodToEat: [
            "Free tapas Calle Sagasta (order Tinto de Verano)",
            "Cochifrito Extremeño",
            "Ibores DOP goat cheese",
            "Pitarra wines"
          ],
          restaurantsBars: [
            "Mercado Gastronómico San Albín stalls",
            "El Puchero de la Nieta",
            "La Bodeguilla de Almeda (jamón shrine)"
          ],
          tips: [
            "Historic-site pass €17 covers 6 monuments; buy at any entry.",
            "Sites close ~18:30 in winter; start early.",
            "Summer theatre festival July-Aug sells out fast."
          ]
        },
      
        seville: {
          name: "Seville",
          sights: [
            "Real Alcázar (book months ahead)",
            "Seville Cathedral & La Giralda",
            "Barrio Santa Cruz lanes",
            "Plaza de España",
            "Metropol Parasol (Las Setas)",
            "Triana Bridge & Betis riverfront"
          ],
          mustDos: [
            "Alcázar gardens at opening bell",
            "Climb La Giralda 16 ramps",
            "Flamenco in Triana’s CasaLa",
            "Triana sunset tapeo (Sol y Sombra → Vega 10)",
            "Rowboat Plaza de España canal"
          ],
          activities: [
            "Guadalquivir kayak tour",
            "Ceramics workshop at Centro Cerámica Triana",
            "Early-morning churros at Kiosco de Calentitos"
          ],
          foodToEat: [
            "Espinacas con Garbanzos (El Rinconcillo)",
            "Cola de Toro",
            "Salmorejo shot in La Alfalfa",
            "Orange wine at Taberna Álvaro Peregil"
          ],
          restaurantsBars: [
            "El Rinconcillo (1670)",
            "Bodega Santa Cruz Las Columnas",
            "Vega 10 (modern Triana tapas)",
            "Sol y Sombra (classic bullfighting bar)",
            "La Terraza del EME (cathedral view)",
            "La Antigua Abacería de San Lorenzo"
          ],
          tips: [
            "Scams: rosemary sprigs outside Cathedral—ignore.",
            "Timely online tickets mandatory for Alcázar/Cathedral.",
            "Tapas not free; expect €3-4.",
            "Respect flamenco silence, clap on 12-beat compás."
          ]
        },
      
        madrid: {
          name: "Madrid",
          sights: [
            "Prado Museum",
            "Retiro Park & Crystal Palace",
            "Royal Palace & Almudena Cathedral",
            "Reina Sofía (Guernica)",
            "Gran Vía architecture stroll"
          ],
          mustDos: [
            "Museum tri-fecta day (Prado → Thyssen → Reina Sofía)",
            "Picnic rowboat Retiro lake",
            "Sunday Rastro flea market + La Latina tapas"
          ],
          activities: [
            "Bernabéu Stadium tour",
            "Flamenco at Cardamomo tablao",
            "Malasaña bar-hop 21:00-03:00"
          ],
          foodToEat: [
            "Bocadillo de Calamares at Bar La Campana",
            "Churros con Chocolate at San Ginés",
            "Cocido Madrileño (La Bola)"
          ],
          restaurantsBars: [
            "Casa Camacho (Yayo vermouths)",
            "1862 Dry Bar (award-winning cocktails)",
            "Toma Café (third-wave)",
            "Sala Equis (cinema-bar with street-food stalls)",
            "Angelita (natural-wine list)",
            "Azotea del Círculo de Bellas Artes rooftop"
          ],
          tips: [
            "Dinner service rarely before 20:30.",
            "Metro runs till 01:30; night buses (búhos) fill gap.",
            "Malasaña & Chueca pickpockets target phones late-night; keep zipped."
          ]
        },
      
        cadiz: {
          name: "Cádiz",
          sights: [
            "Cádiz Cathedral & Torre de Poniente climb",
            "Torre Tavira camera-obscura",
            "Barrio del Pópulo arches",
            "Roman Theatre",
            "Castillo de San Sebastián sunset walk",
            "La Caleta Beach",
            "Mercado Central de Abastos"
          ],
          mustDos: [
            "La Viña seafood binge (Casa Manteca → El Faro bar)",
            "Infinity-pool-style sunset on Paseo Fernando Quiñones",
            "Oyster shooters in Mercado Gourmet corner"
          ],
          activities: [
            "Bike coastal greenway to Playa de la Victoria",
            "Surf lesson Playa de Cortadura",
            "Carnaval costume shop trawl (all year)"
          ],
          foodToEat: [
            "Tortillitas de Camarones",
            "Atún de Almadraba (May-Jun)",
            "Chicharrones de Cádiz",
            "Papas con Chocos (cuttlefish stew)"
          ],
          restaurantsBars: [
            "Taberna Casa Manteca (standing-only tapas)",
            "El Faro de Cádiz (barra section)",
            "La Candela (creative fusion)",
            "La Tapería de Columela",
            "La Isla del León rooftop (cocktails over bay)"
          ],
          tips: [
            "Torre Tavira ticket gives timed slot—book mornings.",
            "Wear swim shoes on rocky La Caleta entry.",
            "Carnaval (late Feb) doubles accommodation prices."
          ]
        },
      
        ronda: {
          name: "Ronda",
          sights: [
            "Puente Nuevo",
            "El Tajo Gorge",
            "Plaza de Toros & museum",
            "Old Town (La Ciudad)",
            "Arab Baths",
            "Casa del Rey Moro water mine",
            "Mirador de Aldehuela (Instagram cliff deck)"
          ],
          mustDos: [
            "Blue-hour shots of Puente Nuevo from Mirador del Viento trail",
            "Bullring visit for Hemingway lore",
            "Wine flight at Bodega Descalzos Viejos (requires taxi)"
          ],
          activities: [
            "3-km Camino de los Molinos hike under the bridge",
            "Canyoning in Cueva del Gato (summer)",
            "Late-night stargazing over El Tajo"
          ],
          foodToEat: [
            "Rabo de Toro",
            "Payoyo goat cheese plate",
            "Wild-mushroom revuelto",
            "Almendra frita ice-cream (local specialty)"
          ],
          restaurantsBars: [
            "Restaurante Tragata (modern tapas)",
            "Bardal** Michelin (degustation)",
            "De Locos Tapas (tiny creative plates)",
            "Drinks on Parador de Ronda terrace"
          ],
          tips: [
            "Parking fills by 10:00—use southside underground lot.",
            "Bridge viewpoints require steep gravel; trainers ok.",
            "Overnight stay rewards you with empty dawn streets."
          ]
        },
      
        setenil_de_las_bodegas: {
          name: "Setenil de las Bodegas",
          sights: [
            "Calle Cuevas del Sol",
            "Calle Cuevas de la Sombra",
            "Castillo de Setenil tower",
            "Rock-overhang white houses"
          ],
          mustDos: [
            "Coffee under cave-roof at Bar Frasquito",
            "Castle-top panorama over canyon village"
          ],
          activities: [
            "Tapas crawl both cave streets (sun vs shade)",
            "Olive-oil shop tastings"
          ],
          foodToEat: [
            "Chorizo al vino",
            "Local olive-oil drizzled toast",
            "Masitas pastries"
          ],
          restaurantsBars: [
            "La Tasca (river-view cave bar)",
            "Bar La Escueva (house specialty croquetas)",
            "Restaurante Domingos (hearty plato del día)"
          ],
          tips: [
            "Approach from Alcalá del Valle for least hairpins.",
            "Park at top‐of-town lot; downhill walk easier.",
            "Weekends 11:00–15:00 = excursion-bus crush."
          ]
        },
      
        malaga: {
          name: "Málaga",
          sights: [
            "Alcazaba",
            "Castillo de Gibralfaro",
            "Picasso Museum",
            "Roman Theatre",
            "Muelle Uno promenade",
            "Catedral de la Encarnación",
            "Pedregalejo fisherman quarter"
          ],
          mustDos: [
            "Espetos at El Tintero beach chiringuito",
            "Sunset mojito at La Terraza de la Alcazaba",
            "Street-art tour in Soho district"
          ],
          activities: [
            "Hammam Al Ándalus bath circuit",
            "Rooftop-hop: AC Hotel, Room Mate Valeria, San Juan",
            "Caminito del Rey day trip"
          ],
          foodToEat: [
            "Fritura Malagueña",
            "Ajoblanco",
            "Gambas al Pil-Pil",
            "Porra Antequerana",
            "Tarta Malagueña (almond cake with sweet wine)"
          ],
          restaurantsBars: [
            "El Pimpi (iconic bodega)",
            "Casa Lola trilogy of tapas bars",
            "Kaleja* (chef Dani Carnero)",
            "La Terraza del Quizás (new 2025 rooftop DJ sessions)"
          ],
          tips: [
            "Gibralfaro hike shaded after 17:00.",
            "Book Picasso Museum online to skip 40-min queue.",
            "Bicycle lanes along coast great to Pedregalejo."
          ]
        },
      
        granada: {
          name: "Granada",
          sights: [
            "Alhambra & Generalife",
            "Albaicín quarter",
            "Sacromonte cave district",
            "Granada Cathedral & Royal Chapel",
            "Mirador de San Nicolás"
          ],
          mustDos: [
            "Pre-dawn entrance to Alhambra (08:30 first slot)",
            "Free-tapa crawl Calle Navas (Los Diamantes → Bodegas Castañeda)",
            "Flamenco zambra in Sacromonte cave",
            "Tea at Tetería Nazari after sunset"
          ],
          activities: [
            "Hammam Al Ándalus hot-plunge",
            "Arab-spice shopping in Alcaicería souk",
            "Sierra Nevadas day-ski (Nov-Apr)"
          ],
          foodToEat: [
            "Habas con Jamón",
            "Piononos from Santa Fe",
            "Tortilla del Sacromonte",
            "Remojón Granadino"
          ],
          restaurantsBars: [
            "Bar Los Diamantes (seafood)",
            "Bodegas Castañeda (vermut & montaditos)",
            "El Bar de Fede (inventive free tapas)",
            "Bar Poe (international flavours)",
            "La Tana wine bar"
          ],
          tips: [
            "Official Alhambra tickets release 3-4 months out; reseller mark-ups rampant.",
            "Order drink first, tapa arrives free—one per round.",
            "Mirador de San Nicolás busiest 19:00-20:00; alternate is Mirador de los Carvajales."
          ]
        },
      
        cordoba: {
          name: "Córdoba",
          sights: [
            "Mezquita-Catedral",
            "Alcázar de los Reyes Cristianos",
            "Jewish Quarter & Synagogue",
            "Puente Romano",
            "Palacio de Viana",
            "Medina Azahara archaeological site"
          ],
          mustDos: [
            "7:30 Mezquita “silent hour” (free entry, donation)",
            "Evening light show at Alcázar gardens",
            "Patios Festival first fortnight May",
            "Feria de Córdoba late-May caseta crawl"
          ],
          activities: [
            "Horse show at Royal Stables",
            "Bike hire across Puente Romano toward Calahorra Tower museum",
            "Flamenco tavern hop Calleja de las Flores"
          ],
          foodToEat: [
            "Salmorejo Cordobés",
            "Flamenquín",
            "Berenjenas con Miel",
            "Rabo de Toro",
            "Pastel Cordobés"
          ],
          restaurantsBars: [
            "Bodegas Campos",
            "Taberna Salinas",
            "Casa Pepe de la Judería",
            "Mercado Victoria gastromarket",
            "Taberna El Gallo (top salmorejo)"
          ],
          tips: [
            "Mezquita dress-code: shoulders & knees covered.",
            "Summer highs 40 °C—tour early/late.",
            "Feria de Córdoba 2025: 23–31 May at El Arenal, free concerts nightly."
          ]
        }
      };
      

    const routeData = [
        { id: "lisbon-porto", date: "28/10/2025", startLocation: "Lisbon", startCoords: [-9.1393, 38.7223], endLocation: "Porto", endCoords: [-8.6291, 41.1579], departureTime: "9:30am", notes: "Direct route.", waypoints: [] },
        { id: "porto-caceres", date: "29/10/2025", startLocation: "Porto", startCoords: [-8.6291, 41.1579], endLocation: "Caceres", endCoords: [-6.3722, 39.4764], departureTime: "11:00am", notes: "Scenic route to Caceres.", waypoints: [] },
        { id: "caceres-merida", date: "30/10/2025", startLocation: "Caceres", startCoords: [-6.3722, 39.4764], endLocation: "Merida", endCoords: [-6.3437, 38.9158], departureTime: "10:00am", notes: "Short drive to Merida.", waypoints: [] },
        { id: "merida-seville", date: "31/10/2025", startLocation: "Merida", startCoords: [-6.3437, 38.9158], endLocation: "Seville", endCoords: [-5.9845, 37.3891], departureTime: "11:00am", notes: "Journey to the heart of Andalusia.", waypoints: [] },
        { id: "seville-cadiz", date: "01/11/2025", startLocation: "Seville", startCoords: [-5.9845, 37.3891], endLocation: "Cadiz", endCoords: [-6.2926, 36.5298], departureTime: "10:00am", notes: "Direct route.", waypoints: [] },
        { id: "cadiz-ronda", date: "03/11/2025", startLocation: "Cadiz", startCoords: [-6.2926, 36.5298], endLocation: "Ronda", endCoords: [-5.1642, 36.7376], departureTime: "11:00am", notes: "Scenic route via Zahara de la Sierra.", waypoints: [[-5.3925, 36.8398]] },
        { id: "ronda-setenil", date: "04/11/2025", startLocation: "Ronda", startCoords: [-5.1642, 36.7376], endLocation: "Setenil de las Bodegas", endCoords: [-5.1795, 36.8645], departureTime: "9:00am", notes: "Day trip to Setenil de las Bodegas.", waypoints: [] },
        { id: "setenil-ronda", date: "04/11/2025", startLocation: "Setenil de las Bodegas", startCoords: [-5.1795, 36.8645], endLocation: "Ronda", endCoords: [-5.1642, 36.7376], departureTime: "1:00pm", notes: "Return from Setenil de las Bodegas.", waypoints: [] },
        { id: "ronda-malaga", date: "04/11/2025", startLocation: "Ronda", startCoords: [-5.1642, 36.7376], endLocation: "Malaga", endCoords: [-4.4214, 36.7213], departureTime: "4:00pm", notes: "Direct route to Malaga after Setenil day trip.", waypoints: [] },
        { id: "malaga-granada", date: "06/11/2025", startLocation: "Malaga", startCoords: [-4.4214, 36.7213], endLocation: "Granada", endCoords: [-3.5986, 37.1773], departureTime: "1:00pm", notes: "Direct route.", waypoints: [] },
        { id: "granada-cordoba", date: "09/11/2025", startLocation: "Granada", startCoords: [-3.5986, 37.1773], endLocation: "Cordoba", endCoords: [-4.7794, 37.8882], departureTime: "2:00pm", notes: "Direct route.", waypoints: [] },
        { id: "cordoba-madrid", date: "11/11/2025", startLocation: "Cordoba", startCoords: [-4.7794, 37.8882], endLocation: "Madrid", endCoords: [-3.7038, 40.4168], departureTime: "10:00am", notes: "With a stop to see the sights in Toledo.", waypoints: [[-4.0273, 39.8628]] }
    ];

    const defaultMarkerIcon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
    const waypointMarkerIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -30], shadowSize: [33, 33] });

    // --- Event Listeners & UI Functions ---
    clearCacheButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the route cache and reload all routes? This will use API credits.')) {
            clearLocalStorageRoutes();
            localStorage.setItem('routeCacheVersion', CACHE_VERSION);
            routeListElement.innerHTML = '';
            routeFeatureGroup.clearLayers();
            cityMarkersGroup.clearLayers();
            routeLayers = [];
            activeRouteLayer = null;
            cityDataMarkers = {};
            showRouteList(); 
            alert('Cache cleared. Reloading routes...');
            processAllRoutes();
        }
    });

    backToRoutesButton.addEventListener('click', function() {
        showRouteList();
    });

    async function fetchRouteGeometry(segment) {
        const cacheKey = `route_${CACHE_VERSION}_${segment.id}`;
        const cachedRoute = localStorage.getItem(cacheKey);
        if (cachedRoute) {
            console.log(`[fetch] Using cached route for ${segment.id}`);
            try { return JSON.parse(cachedRoute); }
            catch (e) { console.error(`[fetch] Error parsing cache for ${segment.id}:`, e); localStorage.removeItem(cacheKey); }
        }
        console.log(`[fetch] API call for ${segment.id}`);
        const coordinates = [segment.startCoords, ...segment.waypoints, segment.endCoords];
        const body = JSON.stringify({ coordinates: coordinates });
        try {
            const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
                method: 'POST',
                headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json, application/geo+json' },
                body: body
            });
            if (!response.ok) {
                let errData;
                try { errData = await response.json(); } catch (e) { errData = { error: { message: await response.text() || "Unknown API error"}}; }
                console.error(`[fetch] API Error for ${segment.id}:`, errData);
                throw new Error(`ORS API: ${response.status} ${errData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const geometry = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
                try { localStorage.setItem(cacheKey, JSON.stringify(geometry)); console.log(`[fetch] Cached ${segment.id}`);}
                catch (e) { console.error('[fetch] localStorage save error:', e); }
                return geometry;
            } else { throw new Error('No route features from ORS.'); }
        } catch (error) {
            console.error(`[fetch] Detailed error for ${segment.id}:`, error);
            return [segment.startCoords, ...segment.waypoints, segment.endCoords].map(c => [c[1], c[0]]);
        }
    }

    function addCityMarker(cityName, coords) {
        const cityId = cityName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, ''); 
        if (!cityDataMarkers[cityId] && cityDetailsData[cityId]) {
            const marker = L.marker([coords[1], coords[0]], { icon: defaultMarkerIcon })
                .bindPopup(`<b>${cityName}</b><br>Click for details`)
                .on('click', () => displayCityInfo(cityId));
            cityMarkersGroup.addLayer(marker);
            cityDataMarkers[cityId] = marker;
        }
    }

    function addRouteToMapAndPanel(segment, geometry) {
        const routeColor = '#FF0000';
        const highlightedRouteColor = '#007bff';
        const polyline = L.polyline(geometry, { color: routeColor, weight: 5, opacity: 0.8 });
        routeFeatureGroup.addLayer(polyline);
        const routeLayerInfo = { id: segment.id, polyline: polyline, originalColor: routeColor, highlightColor: highlightedRouteColor, segmentData: segment };
        routeLayers.push(routeLayerInfo);

        addCityMarker(segment.startLocation, segment.startCoords);
        addCityMarker(segment.endLocation, segment.endCoords);

        const routeItemDiv = document.createElement('div');
        routeItemDiv.classList.add('route-item');
        routeItemDiv.dataset.routeId = segment.id;
        routeItemDiv.innerHTML = `<h3>${segment.startLocation} &rarr; ${segment.endLocation}</h3><p><strong>Date:</strong> ${segment.date}</p><p><strong>Departure:</strong> ${segment.departureTime}</p>`;
        
        console.log(`[addRouteToMapAndPanel] About to append route item for ${segment.id} to routeListElement.`);
        if (routeListElement) {
            routeListElement.appendChild(routeItemDiv);
            console.log(`[addRouteToMapAndPanel] Successfully appended route item for ${segment.id}. Children count: ${routeListElement.children.length}`);
        } else {
            console.error("[addRouteToMapAndPanel] routeListElement is null or undefined!");
        }


        routeItemDiv.addEventListener('click', () => {
            setActiveRoute(routeLayerInfo, routeItemDiv);
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            const destinationCityId = segment.endLocation.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
            displayCityInfo(destinationCityId);
        });
        

        polyline.on('click', (e) => {
            const correspondingPanelItem = routeListElement.querySelector(`.route-item[data-route-id="${segment.id}"]`);
            setActiveRoute(routeLayerInfo, correspondingPanelItem);
            L.DomEvent.stopPropagation(e);
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            const destinationCityId = segment.endLocation.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
            displayCityInfo(destinationCityId);
        });
    }

    function populateTabContent(tabId, dataArray) {
        const contentDiv = document.getElementById(`${tabId}-content`);
        if (!contentDiv) { console.error(`Tab content div not found: ${tabId}-content`); return; }
        contentDiv.innerHTML = '';
        if (dataArray && dataArray.length > 0) {
            const ul = document.createElement('ul');
            dataArray.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = typeof item === 'string' ? item : (item.name ? `<strong>${item.name}</strong>${item.description ? `: ${item.description}` : ''}` : 'Invalid item format');
                ul.appendChild(li);
            });
            contentDiv.appendChild(ul);
        } else {
            contentDiv.innerHTML = '<p>No specific information available for this category.</p>';
        }
    }

    function displayCityInfo(cityId) {
        const city = cityDetailsData[cityId];
        if (!city) {
            showRouteList();
            infoPanelTitle.textContent = "Route Details";
            console.warn(`[displayCityInfo] No data for city ID: ${cityId}. Showing route list.`);
            return;
        }
        infoPanelTitle.textContent = `Details for ${city.name}`;
        routeInfoSection.classList.add('hidden');
        cityDetailsSection.classList.remove('hidden');
        noCitySelectedDiv.classList.add('hidden');
        backToRoutesButton.classList.remove('hidden');

        populateTabContent('sights', city.sights);
        populateTabContent('must-dos', city.mustDos);
        populateTabContent('activities', city.activities);
        populateTabContent('food', city.foodToEat);
        populateTabContent('restaurants-bars', city.restaurantsBars);
        populateTabContent('tips', city.tips);

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        const sightsTabButton = document.querySelector('.tab-button[data-tab="sights"]');
        const sightsContentPane = document.getElementById('sights-content');
        if (sightsTabButton) sightsTabButton.classList.add('active');
        if (sightsContentPane) sightsContentPane.classList.add('active');
    }

    function showRouteList() {
        infoPanelTitle.textContent = "Route Details";
        routeInfoSection.classList.remove('hidden'); // Ensure this is visible when showing routes
        cityDetailsSection.classList.add('hidden');
        backToRoutesButton.classList.add('hidden');
        
        if (activeRouteLayer) {
            activeRouteLayer.polyline.setStyle({ color: activeRouteLayer.originalColor, weight: 5, opacity: 0.8 });
            const oldPanelItem = routeListElement.querySelector('.route-item.active');
            if (oldPanelItem) oldPanelItem.classList.remove('active');
            activeRouteLayer = null;
        }

        // Control visibility of noCitySelectedDiv based on actual content of routeListElement
        if (routeListElement && routeListElement.children.length > 0) {
            noCitySelectedDiv.classList.add('hidden');
        } else {
            noCitySelectedDiv.textContent = 'No routes to display or still processing.';
            noCitySelectedDiv.classList.remove('hidden');
            routeInfoSection.classList.add('hidden'); // Hide if there are no items to show
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

    function setActiveRoute(routeLayerInfo, panelItemElement) {
        if (activeRouteLayer) {
            activeRouteLayer.polyline.setStyle({ color: activeRouteLayer.originalColor, weight: 5, opacity: 0.8 });
            const oldPanelItem = routeListElement.querySelector('.route-item.active');
            if (oldPanelItem) oldPanelItem.classList.remove('active');
        }
        routeLayerInfo.polyline.setStyle({ color: routeLayerInfo.highlightColor, weight: 7, opacity: 1 });
        routeLayerInfo.polyline.bringToFront();
        if (panelItemElement) panelItemElement.classList.add('active');
        activeRouteLayer = routeLayerInfo;
    }

    async function processAllRoutes() {
        console.log("[processAllRoutes] Starting.");
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.textContent = 'Processing routes (0%)...';
        
        // --- UI Setup for processing ---
        infoPanelTitle.textContent = "Route Details";
        routeListElement.innerHTML = ''; // Clear previous items
        cityDetailsSection.classList.add('hidden');
        backToRoutesButton.classList.add('hidden');
        routeInfoSection.classList.remove('hidden'); // Make sure this is visible for items to be added into
        noCitySelectedDiv.classList.add('hidden');   // Hide "no city/route" message for now
        // --- End UI Setup ---
        
        let routesProcessed = 0;
        let allFromCache = true;

        if (routeData.length === 0) {
            console.log("[processAllRoutes] No routes defined in routeData.");
            noCitySelectedDiv.textContent = 'No routes defined to display.';
            noCitySelectedDiv.classList.remove('hidden');
            routeInfoSection.classList.add('hidden'); 
            loadingIndicator.classList.add('hidden');
            return;
        }

        for (const segment of routeData) {
            console.log(`[process] Segment: ${segment.id}`);
            if (!segment?.id || !segment.startCoords || !segment.endCoords || !segment.waypoints) {
                console.error(`[process] Malformed segment ${segment?.id || 'unknown'}. Skipping.`, segment);
                routesProcessed++;
                loadingIndicator.textContent = `Processing routes (${Math.round((routesProcessed / routeData.length) * 100)}%)...`;
                continue;
            }
            const cacheKey = `route_${CACHE_VERSION}_${segment.id}`;
            if (!localStorage.getItem(cacheKey)) allFromCache = false;
            let geometry;
            try {
                geometry = await fetchRouteGeometry(segment);
                addRouteToMapAndPanel(segment, geometry);
            } catch (loopError) {
                console.error(`[process] Error for segment ${segment.id}:`, loopError);
                geometry = [segment.startCoords, ...segment.waypoints, segment.endCoords].map(c => [c[1], c[0]]);
                try { addRouteToMapAndPanel(segment, geometry); } catch (addError) { console.error(`[process] Error adding fallback for ${segment.id}:`, addError); }
            }
            routesProcessed++;
            loadingIndicator.textContent = `Processing routes (${Math.round((routesProcessed / routeData.length) * 100)}%)...`;
        }
        
        // Final UI update after loop
        if (routeListElement.children.length > 0) {
            console.log(`[processAllRoutes] ${routeListElement.children.length} route items in panel.`);
            routeInfoSection.classList.remove('hidden');
            noCitySelectedDiv.classList.add('hidden');
            if (routeLayers.length > 0) {
                 map.fitBounds(routeFeatureGroup.getBounds(), { padding: [50, 50] });
            }
        } else if (routeData.length > 0) {
            console.log("[processAllRoutes] routeData present, but routeListElement is empty after loop.");
            noCitySelectedDiv.textContent = 'Failed to display route items. Check console for errors.';
            noCitySelectedDiv.classList.remove('hidden');
            routeInfoSection.classList.add('hidden');
        } else { // routeData was empty - already handled, but as a fallback
            noCitySelectedDiv.textContent = 'No routes defined to display.';
            noCitySelectedDiv.classList.remove('hidden');
            routeInfoSection.classList.add('hidden');
        }

        if (allFromCache && routeData.length > 0 && routeListElement.children.length > 0) {
            loadingIndicator.textContent = 'All routes loaded from cache.';
            setTimeout(() => loadingIndicator.classList.add('hidden'), 2000);
        } else if (routeData.length > 0 && routeListElement.children.length > 0) {
            loadingIndicator.classList.add('hidden');
        } else { 
            if (!loadingIndicator.classList.contains('hidden')) {
                 loadingIndicator.classList.add('hidden');
            }
        }
        console.log("[processAllRoutes] Finished.");
    }
    processAllRoutes();
});

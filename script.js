// Configuración inicial
const defaultCoords = [51.505, -0.09];
const defaultZoom = 13;
const OPENWEATHER_API_KEY = '5eb8d46c860f252c9b2804d2765bdb5f';

// Inicializar el mapa
const map = L.map('map').setView(defaultCoords, defaultZoom);

// Variables para las capas del clima
let currentWeatherLayer = null;

// Función para obtener y mostrar el clima actual
async function fetchWeather(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`);
        const data = await response.json();
        
        document.getElementById('weather-description').textContent = data.weather[0].description;
        document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById('weather-humidity').textContent = `Humedad: ${data.main.humidity}%`;
        document.getElementById('weather-wind').textContent = `Viento: ${data.wind.speed} m/s`;
        document.getElementById('weather-feels-like').textContent = `Sensación térmica: ${Math.round(data.main.feels_like)}°C`;
        document.getElementById('weather-pressure').textContent = `Presión: ${data.main.pressure} hPa`;
        document.getElementById('weather-visibility').textContent = `Visibilidad: ${data.visibility / 1000} km`;
    } catch (error) {
        console.error('Error al obtener el clima:', error);
    }
}

// Función para centrar el mapa en la ubicación del usuario
function centerMapOnUserLocation(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    map.setView([lat, lon], defaultZoom);
    L.marker([lat, lon]).addTo(map)
        .bindPopup('¡Estás aquí!')
        .openPopup();
    
    // Obtener el clima para la ubicación actual
    fetchWeather(lat, lon);
}

// Función para manejar errores de geolocalización o si no está disponible
function handleLocationError() {
    console.warn('No se pudo obtener la ubicación del usuario. Usando ubicación predeterminada.');
    fetchWeather(defaultCoords[0], defaultCoords[1]); // Obtener clima para la ubicación predeterminada
    // El mapa ya está centrado en la ubicación predeterminada, así que no se necesita hacer nada más aquí.
    // Opcionalmente, se podría mostrar un mensaje al usuario.
}

// Intentar obtener la ubicación del usuario
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(centerMapOnUserLocation, handleLocationError);
} else {
    // El navegador no soporta geolocalización
    handleLocationError();
}

// Añadir la capa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Función para cambiar la capa del clima y aplicar opacidad
function setWeatherLayer(layerType) {
    // Remover la capa actual si existe
    if (currentWeatherLayer) {
        map.removeLayer(currentWeatherLayer);
    }

    // Si se selecciona 'none', no añadir nueva capa
    if (layerType === 'none') {
        currentWeatherLayer = null;
        return;
    }

    // Añadir la nueva capa seleccionada usando Weather Maps 1.0
    const opacity = document.getElementById('opacity').value / 100;
    currentWeatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`, {
        attribution: '&copy; OpenWeatherMap',
        maxZoom: 18,
        opacity: opacity
    }).addTo(map);
}

// Manejar cambios en los controles de radio y opacidad
document.querySelectorAll('input[name="weatherLayer"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        setWeatherLayer(e.target.value);
    });
});

// Manejar cambios en el control de opacidad
const opacitySlider = document.getElementById('opacity');
const opacityValueDisplay = document.getElementById('opacity-value');

opacitySlider.addEventListener('input', (e) => {
    const opacity = e.target.value / 100;
    opacityValueDisplay.textContent = `${e.target.value}%`;
    if (currentWeatherLayer) {
        currentWeatherLayer.setOpacity(opacity);
    }
});



// Obtener el clima para la ubicación predeterminada si no se puede obtener la ubicación del usuario
if (!navigator.geolocation) {
    fetchWeather(defaultCoords[0], defaultCoords[1]);
}

// --- Funcionalidad del Modal de Pronóstico ---
async function checkLaundryViability(forecastData) {
    const current = forecastData.list[0];
    const precip = current.rain?.['3h'] || 0;
    const humidity = current.main.humidity;
    const wind = current.wind.speed;

    let result = {
        level: 4,
        message: 'Mal momento',
        description: 'Condiciones desfavorables para tender ropa'
    };

    if (precip === 0 && humidity < 70 && wind < 5) {
        result = {
            level: 1,
            message: 'Momento perfecto',
            description: 'Condiciones ideales: sin lluvia, humedad baja y viento suave'
        };
    } else if (precip === 0 && humidity < 80 && wind < 8) {
        result = {
            level: 2,
            message: 'Buen momento',
            description: 'Condiciones adecuadas para secado rápido'
        };
    } else if (precip < 1 && humidity < 85 && wind < 12) {
        result = {
            level: 3,
            message: 'Momento arriesgado',
            description: 'Posibilidad de lluvia ligera o humedad elevada'
        };
    }

    return result;
}

// --- Funcionalidad del Modal para Colgar Ropa ---
const currentWeatherModal = document.getElementById('current-weather-modal');
const laundryModal = document.getElementById('laundry-modal');
const forecastModal = document.getElementById('forecast-modal');
const forecastButton = document.getElementById('forecast-button');
const closeButton = document.querySelector('.modal-content .close-button');
const forecastDataContainer = document.getElementById('forecast-data');

// Función para obtener y mostrar el pronóstico de 3 horas
async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=8`); // cnt=8 para obtener 8 intervalos de 3 horas = 24 horas
        const data = await response.json();

        if (data.cod !== "200") {
            console.error('Error en la respuesta de la API de pronóstico:', data.message);
            forecastDataContainer.innerHTML = '<p>No se pudo obtener el pronóstico.</p>';
            return;
        }

        forecastDataContainer.innerHTML = ''; // Limpiar contenido anterior

        // Mostrar solo los primeros ~3 pronósticos (aproximadamente 3 horas cada uno)
        // OpenWeatherMap devuelve pronósticos en intervalos de 3 horas.
        // Para las próximas ~3 horas, podríamos mostrar el primer o los dos primeros elementos.
        // Mostraremos el pronóstico más cercano a las próximas 3 horas.
        const forecastToShow = data.list.slice(0, 1); // Tomamos el primer intervalo de 3 horas.

        if (forecastToShow.length === 0) {
            forecastDataContainer.innerHTML = '<p>No hay datos de pronóstico disponibles para las próximas horas.</p>';
            return;
        }

        forecastToShow.forEach(item => {
            const dateTime = new Date(item.dt * 1000);
            const timeString = dateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const forecastElement = document.createElement('div');
            forecastElement.classList.add('forecast-item');
            forecastElement.innerHTML = `
                <h4>${timeString}</h4>
                <p><img src="http://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}"> ${item.weather[0].description}</p>
                <p>Temperatura: ${Math.round(item.main.temp)}°C (Min: ${Math.round(item.main.temp_min)}°C, Max: ${Math.round(item.main.temp_max)}°C)</p>
                <p>Humedad: ${item.main.humidity}%</p>
                <p>Viento: ${item.wind.speed} m/s</p>
            `;
            forecastDataContainer.appendChild(forecastElement);
        });

    } catch (error) {
        console.error('Error al obtener el pronóstico:', error);
        forecastDataContainer.innerHTML = '<p>Ocurrió un error al cargar el pronóstico.</p>';
    }
}

// Abrir modal
forecastButton.addEventListener('click', () => {
    forecastModal.style.display = 'block';
    // Obtener la ubicación actual del mapa para el pronóstico
    const center = map.getCenter();
    fetchForecast(center.lat, center.lng);
});

// Cerrar modal con el botón X
closeButton.addEventListener('click', () => {
    forecastModal.style.display = 'none';
});

// Cerrar modales haciendo clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target === forecastModal) forecastModal.style.display = 'none';
    if (event.target === currentWeatherModal) currentWeatherModal.style.display = 'none';
    if (event.target === laundryModal) laundryModal.style.display = 'none';
});

// Manejar el botón de clima actual
document.getElementById('current-weather-button').addEventListener('click', () => {
    currentWeatherModal.style.display = 'block';
    const center = map.getCenter();
    fetchWeather(center.lat, center.lng);
});

// Manejar el botón de lavandería
document.getElementById('laundry-button').addEventListener('click', async () => {
    laundryModal.style.display = 'block';
    const center = map.getCenter();
    
    try {
        const forecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${center.lat}&lon=${center.lng}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=1`);
        const data = await forecast.json();
        const currentData = data.list[0];
const result = await checkLaundryViability(data);
        
        document.getElementById('laundry-result').innerHTML = `
            <div class="result-level level-${result.level}">
                <h4>${result.message}</h4>
                <p>${result.description}</p>
                <p>Precipitación: ${(currentData.rain?.['3h'] || 0).toFixed(1)} mm</p>
                <p>Humedad: ${currentData.main.humidity}%</p>
                <p>Viento: ${currentData.wind.speed} m/s</p>
            </div>
        `;
    } catch (error) {
        console.error('Error en la evaluación:', error);
        document.getElementById('laundry-result').innerHTML = '<p>Error al evaluar las condiciones</p>';
    }
});

// Configuración inicial
const defaultCoords = [51.505, -0.09];
const defaultZoom = 13;
const OPENWEATHER_API_KEY = '5eb8d46c860f252c9b2804d2765bdb5f';

// Inicializar el mapa
const map = L.map('map').setView(defaultCoords, defaultZoom);

// Variables para las capas del clima
let currentWeatherLayer = null;
const WEATHER_LAYER_CLASSNAME = 'weather-tile-layer'; // Clase para la capa de clima
let currentBrightness = 100; // Valor inicial de brillo (100%)
let currentContrast = 100; // Valor inicial de contraste (100%)

// --- Referencias a Modales ---
const currentWeatherModal = document.getElementById('current-weather-modal');
const forecastModal = document.getElementById('forecast-modal');
const forecastOptionsModal = document.getElementById('forecast-options-modal');
const laundryModal = document.getElementById('laundry-modal'); // Nuevo modal

// --- Referencias a Botones ---
const forecastButton = document.getElementById('forecast-button');
const currentWeatherButton = document.getElementById('current-weather-button');
const laundryButton = document.getElementById('laundry-button'); // Nuevo botón

// --- Referencias a Contenedores de Datos ---
const forecastDataContainer = document.getElementById('forecast-data');

// --- Referencias a Controles de Capa ---
const opacitySlider = document.getElementById('opacity');
const opacityValueDisplay = document.getElementById('opacity-value');
const brightnessSlider = document.getElementById('brightness');
const brightnessValueDisplay = document.getElementById('brightness-value');
const contrastSlider = document.getElementById('contrast');
const contrastValueDisplay = document.getElementById('contrast-value');

// Función para aplicar filtros de brillo y contraste a la capa de clima
function applyWeatherLayerFilters() {
    if (currentWeatherLayer) {
        const layerContainer = currentWeatherLayer.getContainer();
        if (layerContainer) {
            layerContainer.style.filter = `brightness(${currentBrightness}%) contrast(${currentContrast}%)`;
        }
    }
}

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

        // Mostrar icono del clima
        const weatherIcon = document.getElementById('weather-icon');
        weatherIcon.src = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`; // @2x para icono más grande
        weatherIcon.alt = data.weather[0].description;
        weatherIcon.style.display = 'block';

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
    
    // Obtener el clima para la ubicación actual y mostrarlo en el modal si está abierto
    // o si se acaba de obtener la ubicación.
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

// Función para cambiar la capa del clima y aplicar opacidad, brillo y contraste
function setWeatherLayer(layerType) {
    // Remover la capa actual si existe
    if (currentWeatherLayer) {
        map.removeLayer(currentWeatherLayer);
        const oldLayerContainer = currentWeatherLayer.getContainer();
        if (oldLayerContainer) {
            oldLayerContainer.classList.remove(WEATHER_LAYER_CLASSNAME);
            oldLayerContainer.style.filter = ''; // Reset filter
        }
    }

    // Si se selecciona 'none', no añadir nueva capa
    if (layerType === 'none') {
        currentWeatherLayer = null;
        return;
    }

    // Añadir la nueva capa seleccionada usando Weather Maps 1.0
    const opacity = opacitySlider.value / 100; // Usar el valor actual del slider de opacidad
    currentWeatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`, {
        attribution: '&copy; OpenWeatherMap',
        maxZoom: 18,
        opacity: opacity
    });

    currentWeatherLayer.on('load', function() {
        // Aplicar filtros una vez que la capa esté completamente cargada puede ser más robusto
        // pero aplicar al contenedor directamente suele funcionar bien.
        // applyWeatherLayerFilters(); // Opcional: reaplicar al cargar completamente
    });

    currentWeatherLayer.addTo(map);
    
    // Asignar clase y aplicar filtros
    const layerContainer = currentWeatherLayer.getContainer();
    if (layerContainer) {
        layerContainer.classList.add(WEATHER_LAYER_CLASSNAME);
        applyWeatherLayerFilters(); // Aplicar filtros actuales a la nueva capa
    }
}

// Manejar cambios en los controles de radio para capas de clima
document.querySelectorAll('input[name="weatherLayer"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        setWeatherLayer(e.target.value);
    });
});

// Manejar cambios en el control de opacidad
opacitySlider.addEventListener('input', (e) => {
    const opacity = e.target.value / 100;
    opacityValueDisplay.textContent = `${e.target.value}%`;
    if (currentWeatherLayer) {
        currentWeatherLayer.setOpacity(opacity);
    }
});

// Manejar cambios en el control de brillo
if (brightnessSlider && brightnessValueDisplay) {
    brightnessSlider.addEventListener('input', (e) => {
        currentBrightness = parseInt(e.target.value);
        brightnessValueDisplay.textContent = `${currentBrightness}%`;
        applyWeatherLayerFilters();
    });
}

// Manejar cambios en el control de contraste
if (contrastSlider && contrastValueDisplay) {
    contrastSlider.addEventListener('input', (e) => {
        currentContrast = parseInt(e.target.value);
        contrastValueDisplay.textContent = `${currentContrast}%`;
        applyWeatherLayerFilters();
    });
}

// Obtener el clima para la ubicación predeterminada si no se puede obtener la ubicación del usuario
if (!navigator.geolocation) {
    fetchWeather(defaultCoords[0], defaultCoords[1]);
}

// --- Funcionalidad del Modal de Pronóstico ---

// Función para evaluar las condiciones de secado para un conjunto de intervalos de pronóstico
function evaluateDryingConditions(forecastItems) {
    let totalRain = 0;
    let maxWind = 0;
    let avgHumidity = 0;
    let avgPop = 0; // Average Probability of Precipitation
    const itemCount = forecastItems.length;

    if (itemCount === 0) {
        return {
            level: 4,
            message: "No hay datos de pronóstico.",
            description: "No se pueden evaluar las condiciones."
        };
    }

    forecastItems.forEach(item => {
        totalRain += (item.rain && item.rain['3h']) ? item.rain['3h'] : 0;
        if (item.wind.speed > maxWind) maxWind = item.wind.speed;
        avgHumidity += item.main.humidity;
        avgPop += item.pop || 0;
    });

    avgHumidity /= itemCount;
    avgPop /= itemCount;

    let result = {
        level: 4, // Por defecto, mal momento
        message: "Mal momento para colgar la ropa.",
        description: ""
    };

    // Lógica de decisión
    // Ajustar umbrales de lluvia según la cantidad de intervalos (itemCount)
    // Para 1 intervalo (3h), umbral base. Para 2 intervalos (6h), el doble, etc.
    if (avgPop < 0.1 && totalRain < (0.2 * itemCount) && maxWind < 7 && avgHumidity < 70) {
        result.level = 1; // Excelente
        result.message = "¡Condiciones Excelentes!";
        result.description = `Prob. lluvia: ${(avgPop * 100).toFixed(0)}%, Lluvia: ${totalRain.toFixed(1)}mm, Viento: ${maxWind.toFixed(1)} m/s, Humedad: ${avgHumidity.toFixed(0)}%.`;
    } else if (avgPop < 0.3 && totalRain < (1 * itemCount) && maxWind < 10 && avgHumidity < 80) {
        result.level = 2; // Bueno
        result.message = "Buenas condiciones.";
        result.description = `Prob. lluvia: ${(avgPop * 100).toFixed(0)}%, Lluvia: ${totalRain.toFixed(1)}mm, Viento: ${maxWind.toFixed(1)} m/s, Humedad: ${avgHumidity.toFixed(0)}%.`;
    } else if (avgPop < 0.6 && totalRain < (2 * itemCount) && maxWind < 12) {
        result.level = 3; // Arriesgado
        result.message = "Condiciones Arriesgadas.";
        result.description = `Prob. lluvia: ${(avgPop * 100).toFixed(0)}%, Lluvia: ${totalRain.toFixed(1)}mm, Viento: ${maxWind.toFixed(1)} m/s, Humedad: ${avgHumidity.toFixed(0)}%.`;
    } else {
        // Mal momento (ya es el por defecto)
        result.description = `Prob. lluvia: ${(avgPop * 100).toFixed(0)}% o Lluvia: ${totalRain.toFixed(1)}mm o Viento: ${maxWind.toFixed(1)} m/s o Humedad: ${avgHumidity.toFixed(0)}%.`;
    }
    return result;
}

// Función para analizar el pronóstico de las próximas 24h y encontrar el mejor momento
async function analyzeLaundryForecastForNext24h(forecastDataList) {
    // 1. Evaluación para las próximas ~6 horas (primeros 2 intervalos)
    const currentConditionsItems = forecastDataList.slice(0, 2); // Primeros 2 intervalos = 6 horas
    const currentEvaluation = evaluateDryingConditions(currentConditionsItems);
    let currentRecommendation = {
        message: "Evaluación para las próximas 6 horas:",
        level: currentEvaluation.level,
        details: `${currentEvaluation.message} ${currentEvaluation.description}`
    };

    // 2. Buscar la mejor ventana en las próximas 24 horas (8 intervalos)
    let bestWindowInfo = {
        found: false,
        startTime: null,
        endTime: null,
        level: 5, // Peor que el nivel 4 para empezar
        message: "No se encontró una ventana óptima en 24h.",
        description: ""
    };

    // Intentar encontrar ventanas de 6 horas (2 intervalos)
    for (let i = 0; i <= forecastDataList.length - 2; i++) { // -2 porque tomamos 2 intervalos
        const windowItems = forecastDataList.slice(i, i + 2);
        const windowEvaluation = evaluateDryingConditions(windowItems);
        if (windowEvaluation.level < bestWindowInfo.level) {
            bestWindowInfo.found = true;
            bestWindowInfo.level = windowEvaluation.level;
            const startDate = new Date(windowItems[0].dt * 1000);
            // El dt es el inicio del primer intervalo de la ventana.
            // La ventana de 6h termina 6h después del inicio del primer intervalo.
            const endDate = new Date(windowItems[0].dt * 1000);
            endDate.setHours(endDate.getHours() + 6); 
            
            bestWindowInfo.startTime = startDate.toLocaleTimeString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            bestWindowInfo.endTime = endDate.toLocaleTimeString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            bestWindowInfo.message = `Mejor ventana (6h) encontrada: ${bestWindowInfo.startTime} - ${bestWindowInfo.endTime}.`;
            bestWindowInfo.description = `${windowEvaluation.message} ${windowEvaluation.description}`;
        }
    }

    // Si no se encontró una buena ventana de 6h (nivel 1 o 2), buscar una de 3h
    if (!bestWindowInfo.found || bestWindowInfo.level > 2) {
        for (let i = 0; i < forecastDataList.length; i++) { // Iterar sobre cada intervalo individualmente
            const windowItems = [forecastDataList[i]]; // Ventana de 3 horas
            const windowEvaluation = evaluateDryingConditions(windowItems);
            // Solo considerar si es mejor que la ventana de 6h encontrada (si alguna) o si no se encontró ninguna
            if (windowEvaluation.level < bestWindowInfo.level) {
                bestWindowInfo.found = true;
                bestWindowInfo.level = windowEvaluation.level;
                const startDate = new Date(windowItems[0].dt * 1000);
                const endDate = new Date(windowItems[0].dt * 1000);
                endDate.setHours(endDate.getHours() + 3); // Ventana de 3 horas

                bestWindowInfo.startTime = startDate.toLocaleTimeString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                bestWindowInfo.endTime = endDate.toLocaleTimeString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                bestWindowInfo.message = `Mejor ventana (3h) encontrada: ${bestWindowInfo.startTime} - ${bestWindowInfo.endTime}.`;
                bestWindowInfo.description = `${windowEvaluation.message} ${windowEvaluation.description}`;
            }
        }
    }
    
    return { currentRecommendation, bestWindowInfo };
}

// La función checkLaundryViability original ya no es necesaria,
// su lógica ha sido incorporada y mejorada en evaluateDryingConditions y analyzeLaundryForecastForNext24h.
// Se puede eliminar o comentar.
/*
async function checkLaundryViability(forecastData) {
    // ...código anterior de checkLaundryViability...
}
*/

// --- Funcionalidad del Modal para Colgar Ropa ---
// const currentWeatherModal = document.getElementById('current-weather-modal'); // Movido arriba
// const laundryModal = document.getElementById('laundry-modal'); // Movido arriba
// const forecastModal = document.getElementById('forecast-modal'); // Movido arriba
// const forecastButton = document.getElementById('forecast-button'); // Movido arriba

// const closeButton = document.querySelector('.modal-content .close-button'); // Se manejará de forma más genérica
const closeButtons = document.querySelectorAll('.modal-content .close-button');
// const forecastDataContainer = document.getElementById('forecast-data'); // Movido arriba

// Función para obtener y mostrar el pronóstico de 3 horas
async function fetchForecast(lat, lon, hours = 3) { // Parámetro hours añadido
    try {
        const intervals = Math.ceil(hours / 3); // Calcular número de intervalos de 3h
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=${intervals}`);
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
        // const forecastToShow = data.list.slice(0, 1); // Tomamos el primer intervalo de 3 horas.
        const forecastToShow = data.list.slice(0, intervals); // Mostrar los intervalos solicitados

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
// forecastButton.addEventListener('click', () => { // Modificado para abrir modal de opciones
//     forecastModal.style.display = 'block';
//     // Obtener la ubicación actual del mapa para el pronóstico
//     const center = map.getCenter();
//     fetchForecast(center.lat, center.lng);
// });

forecastButton.addEventListener('click', () => {
    if (forecastOptionsModal) forecastOptionsModal.style.display = 'block';
});

// Manejar selección de duración del pronóstico
document.querySelectorAll('.duration-option').forEach(button => {
    button.addEventListener('click', () => {
        const hours = parseInt(button.getAttribute('data-hours'));
        if (forecastOptionsModal) forecastOptionsModal.style.display = 'none';
        if (forecastModal) forecastModal.style.display = 'block';
        const center = map.getCenter();
        fetchForecast(center.lat, center.lng, hours);
    });
});

// Cerrar modal con el botón X
// closeButton.addEventListener('click', () => { // Modificado para múltiples botones de cierre
//     forecastModal.style.display = 'none';
// });
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (currentWeatherModal) currentWeatherModal.style.display = 'none';
        if (forecastModal) forecastModal.style.display = 'none';
        if (forecastOptionsModal) forecastOptionsModal.style.display = 'none';
        if (laundryModal) laundryModal.style.display = 'none'; // Cerrar nuevo modal
    });
});

// Cerrar modales haciendo clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target === forecastModal) forecastModal.style.display = 'none';
    if (event.target === currentWeatherModal) currentWeatherModal.style.display = 'none';
    if (event.target === forecastOptionsModal) forecastOptionsModal.style.display = 'none';
    if (event.target === laundryModal) laundryModal.style.display = 'none'; // Cerrar nuevo modal
});

// Manejar el botón de clima actual
// document.getElementById('current-weather-button').addEventListener('click', () => { // Modificado para usar la referencia
currentWeatherButton.addEventListener('click', () => {
    if (currentWeatherModal) {
        currentWeatherModal.style.display = 'block';
        const center = map.getCenter();
        fetchWeather(center.lat, center.lng); // Asegurarse de que el clima se actualiza al abrir
    }
});

// Manejar el botón de lavandería
if (laundryButton && laundryModal) {
    laundryButton.addEventListener('click', async () => {
        laundryModal.style.display = 'block';
        const center = map.getCenter();
        const laundryResultContainer = document.getElementById('laundry-result');
        laundryResultContainer.innerHTML = '<p>Evaluando condiciones...</p>'; // Mensaje de carga
    
        try {
            // Usaremos el pronóstico de 8 intervalos (24h)
            const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${center.lat}&lon=${center.lng}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=8`);
            const forecastData = await response.json();

            if (forecastData.cod !== "200") {
                throw new Error(forecastData.message || 'Error al obtener el pronóstico.');
            }
            
            // Usar la nueva función de análisis
            const analysis = await analyzeLaundryForecastForNext24h(forecastData.list); 
            
            let htmlResult = `
                <div class="result-level level-${analysis.currentRecommendation.level}">
                    <h4>${analysis.currentRecommendation.message}</h4>
                    <p>${analysis.currentRecommendation.details}</p>
                </div>
            `;

            if (analysis.bestWindowInfo.found) {
                htmlResult += `
                    <div class="result-level level-${analysis.bestWindowInfo.level}" style="margin-top: 15px;">
                        <h4>Predicción Mejor Momento (próx. 24h):</h4>
                        <p><strong>${analysis.bestWindowInfo.message}</strong></p>
                        <p>${analysis.bestWindowInfo.description}</p>
                    </div>
                `;
            } else {
                htmlResult += `
                    <div style="margin-top: 15px;">
                        <h4>Predicción Mejor Momento (próx. 24h):</h4>
                        <p>No se encontró una ventana de secado claramente favorable en las próximas 24 horas.</p>
                    </div>
                `;
            }
            laundryResultContainer.innerHTML = htmlResult;

        } catch (error) {
            console.error('Error en la evaluación de lavandería:', error);
            laundryResultContainer.innerHTML = '<p>Error al evaluar las condiciones. Inténtalo de nuevo.</p>';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('locator_wp_location');
    var mapContainer = document.getElementById('locator_wp_map');
    var lightbox = document.getElementById('locator_wp_map_lightbox');
    var lightboxMap = document.getElementById('locator_wp_lightbox_map');
    var closeButton = document.getElementById('locator_wp_close_lightbox');

    // Initialize the map in the meta box
    var map = L.map('locator_wp_map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize the map in the lightbox
    var lightboxMapInstance = L.map('locator_wp_lightbox_map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(lightboxMapInstance);

    function geocode(address, callback) {
        var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&addressdetails=1';
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    var result = data[0];
                    var lat = result.lat;
                    var lon = result.lon;
                    callback([lat, lon]);
                } else {
                    callback(null);
                }
            })
            .catch(error => {
                console.error('Error during geocoding:', error);
                callback(null);
            });
    }

    function updateMapWithLocation(lat, lon, location) {
        var latlng = [lat, lon];
        map.setView(latlng, 13);
        L.marker(latlng).addTo(map).bindPopup(location);
        lightboxMapInstance.setView(latlng, 13);
        L.marker(latlng).addTo(lightboxMapInstance).bindPopup(location);
    }

    // Autocomplete functionality
    var autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'autocomplete-dropdown';
    document.body.appendChild(autocompleteDropdown);

    input.addEventListener('input', function() {
        var value = input.value;
        if (value.length > 2) {
            geocode(value, function(coords) {
                autocompleteDropdown.innerHTML = '';
                if (coords) {
                    var div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.textContent = value;
                    div.dataset.lat = coords[0];
                    div.dataset.lon = coords[1];
                    div.addEventListener('click', function() {
                        input.value = value;
                        autocompleteDropdown.innerHTML = '';
                        updateMapWithLocation(coords[0], coords[1], value);
                        // Save location directly
                        var post_id = document.getElementById('post_ID').value;
                        var location = value;
                        var post_data = new FormData();
                        post_data.append('action', 'save_location_meta');
                        post_data.append('post_id', post_id);
                        post_data.append('location', location);

                        fetch(window.location.href, {
                            method: 'POST',
                            body: post_data
                        }).then(response => response.text())
                            .then(responseText => {
                                if (responseText.includes('Save')) {
                                    alert('Location saved successfully.');
                                } else {
                                    alert('Error saving location.');
                                }
                            });
                    });
                    autocompleteDropdown.appendChild(div);
                } else {
                    var div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.textContent = 'No results found for "' + value + '"';
                    autocompleteDropdown.appendChild(div);
                }
            });
        } else {
            autocompleteDropdown.innerHTML = '';
        }
    });

    // Lightbox handling
    mapContainer.addEventListener('click', function() {
        lightbox.style.display = 'block';
    });

    closeButton.addEventListener('click', function() {
        lightbox.style.display = 'none';
    });

    // Display the map with posts when shortcode is used
    function loadShortcodeMap() {
        var map = L.map('locator_wp_shortcode_map').setView([0, 0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        fetch(window.location.href + '?action=get_locations')
            .then(response => response.json())
            .then(data => {
                data.forEach(post => {
                    L.marker([post.lat, post.lon]).addTo(map)
                        .bindPopup('<strong>' + post.post_title + '</strong><br><a href="' + post.permalink + '">Read more</a>');
                });
            })
            .catch(error => {
                console.error('Error loading shortcode map:', error);
            });
    }

    if (document.getElementById('locator_wp_shortcode_map')) {
        loadShortcodeMap();
    }
});

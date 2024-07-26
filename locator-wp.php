<?php
/*
Plugin Name: Locator WP
Description: A plugin to add location tags to posts and display them on a map.
Version: 1.0
Author: Craig Gomes
*/

// Enqueue scripts and styles
function locator_wp_enqueue_scripts() {
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet/dist/leaflet.js', array(), null, true);
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet/dist/leaflet.css', array(), null);
    wp_enqueue_script('locator-wp-js', plugin_dir_url(__FILE__) . 'js/locator-wp.js', array('jquery'), null, true);
    wp_enqueue_style('locator-wp-css', plugin_dir_url(__FILE__) . 'css/locator-wp.css');
}
add_action('wp_enqueue_scripts', 'locator_wp_enqueue_scripts');

// Register the meta box
function locator_wp_add_meta_box() {
    add_meta_box(
        'locator_wp_meta_box',
        'Post Location',
        'locator_wp_meta_box_html',
        'post',
        'side',
        'high'
    );
}
add_action('add_meta_boxes', 'locator_wp_add_meta_box');

// Display meta box HTML
function locator_wp_meta_box_html($post) {
    $location = get_post_meta($post->ID, '_locator_wp_location', true);
    ?>
    <label for="locator_wp_location">Location:</label>
    <input type="text" id="locator_wp_location" name="locator_wp_location" value="<?php echo esc_attr($location); ?>" style="width:100%;" />
    <div id="locator_wp_map" style="height: 300px; margin-top: 10px;"></div>
    <div id="locator_wp_map_lightbox" style="display: none;">
        <div id="locator_wp_lightbox_content">
            <button id="locator_wp_close_lightbox">Close</button>
            <div id="locator_wp_lightbox_map" style="height: 400px;"></div>
        </div>
    </div>
    <?php
}

// Save location data when the post is saved
function locator_wp_save_post_location($post_id) {
    // Check if this is an autosave or if the user has the correct permissions
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Check if our custom location field is set
    if (isset($_POST['locator_wp_location'])) {
        $location = sanitize_text_field($_POST['locator_wp_location']);
        update_post_meta($post_id, '_locator_wp_location', $location);
    }
}
add_action('save_post', 'locator_wp_save_post_location');

// Register shortcode
function locator_wp_map_shortcode() {
    $args = array(
        'post_type' => 'post',
        'meta_key' => '_locator_wp_location',
        'meta_value' => '',
        'meta_compare' => '!=',
        'posts_per_page' => -1,
    );
    $query = new WP_Query($args);

    $locations = array();
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $location = get_post_meta(get_the_ID(), '_locator_wp_location', true);
            $title = get_the_title();
            $link = get_permalink();
            $locations[] = array('location' => $location, 'title' => $title, 'link' => $link);
        }
        wp_reset_postdata();
    }

    ob_start();
    ?>
    <div id="locator_wp_global_map" style="height: 500px; width: 100%;"></div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var map = L.map('locator_wp_global_map').setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            function geocode(address, callback) {
                fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address))
                    .then(response => response.json())
                    .then(data => {
                        if (data.length > 0) {
                            callback([data[0].lat, data[0].lon]);
                        } else {
                            callback(null);
                        }
                    });
            }

            var locations = <?php echo json_encode($locations); ?>;

            locations.forEach(function(loc) {
                geocode(loc.location, function(coords) {
                    if (coords) {
                        var marker = L.marker([coords[0], coords[1]]);
                        marker.addTo(map)
                            .bindPopup('<b>' + loc.title + '</b><br><a href="' + loc.link + '">View Post</a>');
                    }
                });
            });
        });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('locator', 'locator_wp_map_shortcode');
?>

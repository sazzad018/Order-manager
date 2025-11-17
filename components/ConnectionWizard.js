import React, { useState } from 'react';

const pluginCode = `<?php
/**
 * Plugin Name:       Order Manager Connector
 * Description:       Connects your WooCommerce store to the E-commerce Order Manager application.
 * Version:           1.0.8
 * Author:            AI Assistant
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       order-manager-connector
 * Requires at least: 5.2
 * Requires PHP:      7.2
 * WC requires at least: 3.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    return;
}

define('OMC_API_KEY_OPTION', 'omc_api_key');

register_activation_hook(__FILE__, 'omc_activate');
function omc_activate() {
    if (!get_option(OMC_API_KEY_OPTION)) {
        omc_generate_api_key();
    }
}

register_deactivation_hook(__FILE__, 'omc_deactivate');
function omc_deactivate() {
    delete_option(OMC_API_KEY_OPTION);
}

function omc_generate_api_key() {
    $api_key = 'omc_key_' . wp_generate_password(40, false);
    update_option(OMC_API_KEY_OPTION, $api_key);
    return $api_key;
}

add_action('admin_menu', 'omc_add_admin_menu');
function omc_add_admin_menu() {
    add_menu_page(
        'Order Manager Connector',
        'Order Manager',
        'manage_options',
        'order-manager-connector',
        'omc_admin_page_html',
        'dashicons-rest-api',
        30
    );
}

function omc_admin_page_html() {
    if (isset($_POST['omc_generate_new_key']) && check_admin_referer('omc_generate_key_nonce')) {
        omc_generate_api_key();
        echo '<div class="notice notice-success is-dismissible"><p>New API Key generated successfully.</p></div>';
    }
    $api_key = get_option(OMC_API_KEY_OPTION);
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>Use the details below to connect your site to the Order Manager application.</p>
        
        <table class="form-table">
            <tbody>
                <tr>
                    <th scope="row"><label for="omc_site_url">Site URL</label></th>
                    <td>
                        <input type="text" id="omc_site_url" readonly value="<?php echo esc_attr(get_site_url()); ?>" class="regular-text" onclick="this.select();">
                        <p class="description">Copy this URL into the "Site URL" field in the Order Manager app.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="omc_api_key">API Key</label></th>
                    <td>
                        <input type="text" id="omc_api_key" readonly value="<?php echo esc_attr($api_key); ?>" class="regular-text" onclick="this.select();">
                        <p class="description">Copy this key into the "API Key" field in the Order Manager app. Treat this like a password.</p>
                    </td>
                </tr>
            </tbody>
        </table>

        <hr>
        
        <form method="post" action="">
            <?php wp_nonce_field('omc_generate_key_nonce'); ?>
            <p>If you believe your API key has been compromised, you can generate a new one. You will need to update the key in the Order Manager app.</p>
            <p class="submit">
                <button type="submit" name="omc_generate_new_key" class="button button-secondary">Generate New API Key</button>
            </p>
        </form>
    </div>
    <?php
}

add_action('rest_api_init', 'omc_register_api_routes');
function omc_register_api_routes() {
    $namespace = 'order-manager/v1';

    register_rest_route($namespace, '/orders', [
        'methods'  => 'GET',
        'callback' => 'omc_get_orders',
        'permission_callback' => 'omc_check_api_key',
    ]);

    register_rest_route($namespace, '/orders/(?P<id>\\d+)', [
        'methods'  => 'POST',
        'callback' => 'omc_update_order_status',
        'permission_callback' => 'omc_check_api_key',
        'args' => [
            'status' => [
                'required' => true,
                'validate_callback' => function($param) {
                    return in_array($param, ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']);
                }
            ],
        ],
    ]);
}

function omc_check_api_key(WP_REST_Request $request) {
    $auth_header = $request->get_header('Authorization');
    $stored_key = get_option(OMC_API_KEY_OPTION);

    if (!$auth_header || !$stored_key) {
        return false;
    }

    if (preg_match('/^Bearer\\s+(.*)$/i', $auth_header, $matches)) {
        $submitted_key = $matches[1];
        return hash_equals($stored_key, $submitted_key);
    }
    
    return false;
}

function omc_format_order_data($order) {
    $items = [];
    foreach ($order->get_items() as $item_id => $item) {
        $product = $item->get_product();
        $items[] = [
            'id'       => $item->get_product_id(),
            'name'     => $item->get_name(),
            'quantity' => $item->get_quantity(),
            'price'    => (float) $order->get_item_subtotal($item, false, false),
            'imageUrl' => $product ? wp_get_attachment_image_url($product->get_image_id(), 'thumbnail') : wc_placeholder_img_src(),
        ];
    }
    
    $status_map = [
        'pending'    => 'Pending',
        'processing' => 'Processing',
        'on-hold'    => 'Pending',
        'completed'  => 'Delivered',
        'cancelled'  => 'Cancelled',
        'refunded'   => 'Cancelled',
        'failed'     => 'Cancelled',
    ];
    $order_status = $order->get_status();

    // Use WooCommerce's built-in formatted address function for reliability.
    $shipping_address_html = $order->get_formatted_shipping_address();
    if ( ! $shipping_address_html ) {
        $shipping_address_html = $order->get_formatted_billing_address();
    }
    
    // Convert <br/> tags to newlines and strip any other HTML for clean text display.
    $shipping_address_text = preg_replace('/<br\\s*?\/?>/i', "\n", $shipping_address_html);
    $shipping_address_text = wp_strip_all_tags($shipping_address_text);
    
    if (empty(trim($shipping_address_text))) {
        $shipping_address_text = 'No address provided.';
    }

    return [
        'id'              => (string) $order->get_id(),
        'customerName'    => $order->get_formatted_billing_full_name(),
        'customerEmail'   => $order->get_billing_email(),
        'customerPhone'   => $order->get_billing_phone(),
        'orderDate'       => $order->get_date_created()->format('c'),
        'status'          => isset($status_map[$order_status]) ? $status_map[$order_status] : ucfirst($order_status),
        'items'           => $items,
        'total'           => (float) $order->get_total(),
        'shippingAddress' => $shipping_address_text,
    ];
}

function omc_get_orders() {
    $orders_raw = wc_get_orders(['limit' => -1, 'orderby' => 'date', 'order' => 'DESC']);
    $response_data = [];
    foreach ($orders_raw as $order) {
        $response_data[] = omc_format_order_data($order);
    }
    return new WP_REST_Response($response_data, 200);
}

function omc_update_order_status(WP_REST_Request $request) {
    $order_id = $request['id'];
    $new_status = $request['status'];
    $order = wc_get_order($order_id);

    if (!$order) {
        return new WP_Error('not_found', 'Order not found', ['status' => 404]);
    }

    try {
        $order->update_status($new_status, 'Order status updated via Order Manager App.', true);
        $order->save();
        return new WP_REST_Response(omc_format_order_data(wc_get_order($order_id)), 200);
    } catch (Exception $e) {
        return new WP_Error('update_failed', $e->getMessage(), ['status' => 500]);
    }
}

add_filter('rest_pre_serve_request', function( $value, $result, $request, $server ) {
    if (strpos($request->get_route(), 'order-manager/v1') !== false) {
        $server->send_header('Access-Control-Allow-Origin', '*');
        $server->send_header('Access-Control-Allow-Methods', 'GET, POST');
        $server->send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    return $value;
}, 10, 4);`;

const ConnectionWizard = ({ onConnect, onClose }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  
  const handleDownloadPlugin = () => {
    const blob = new Blob([pluginCode], { type: 'application/x-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order-manager-connector.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConnect = () => {
    let url = siteUrl.trim();
    const key = apiKey.trim();

    if (!url || !key) {
      setError('Both fields are required.');
      return;
    }
    
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch (_) {
      setError('Please enter a valid Site URL (e.g., https://example.com).');
      return;
    }
    
    setError('');
    onConnect(url, key);
  };

  const closeIcon = React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
  );

  const downloadIcon = React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5" },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" })
  );

  return React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4",
    onClick: onClose,
    "aria-modal": "true",
    role: "dialog"
  },
    React.createElement("div", {
      className: "bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl",
      onClick: (e) => e.stopPropagation()
    },
      React.createElement("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700" },
        React.createElement("div", { className: "flex justify-between items-center" },
          React.createElement("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, "Connect Your WordPress Site"),
          React.createElement("button", {
            onClick: onClose,
            className: "p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800",
            "aria-label": "Close connection wizard"
          }, closeIcon)
        )
      ),
      React.createElement("div", { className: "p-6 space-y-6" },
        React.createElement("div", null,
          React.createElement("h3", { className: "font-semibold text-lg text-gray-800 dark:text-gray-200" }, "Step 1: Install Our Plugin"),
          React.createElement("p", { className: "mt-1 text-gray-600 dark:text-gray-400" },
            "Download the connector plugin. Then, in your WordPress admin dashboard, go to \"Plugins\" > \"Add New\" > \"Upload Plugin\" and upload the downloaded file. After uploading, click \"Activate Plugin\"."
          ),
          React.createElement("button", {
            onClick: handleDownloadPlugin,
            className: "mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
          },
            downloadIcon,
            "Download Plugin"
          )
        ),
        React.createElement("div", null,
          React.createElement("h3", { className: "font-semibold text-lg text-gray-800 dark:text-gray-200" }, "Step 2: Enter Connection Details"),
          React.createElement("p", { className: "mt-1 text-gray-600 dark:text-gray-400" },
            "After activating the plugin, a new \"Order Manager\" menu will appear in your WordPress dashboard. Click on it, then copy the Site URL and API Key and paste them below."
          ),
          React.createElement("div", { className: "mt-4 space-y-4" },
            React.createElement("div", null,
              React.createElement("label", { htmlFor: "siteUrl", className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "Site URL"),
              React.createElement("input", {
                type: "text",
                id: "siteUrl",
                value: siteUrl,
                onChange: (e) => setSiteUrl(e.target.value),
                placeholder: "https://your-wordpress-site.com",
                className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { htmlFor: "apiKey", className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "API Key"),
              React.createElement("input", {
                type: "text",
                id: "apiKey",
                value: apiKey,
                onChange: (e) => setApiKey(e.target.value),
                placeholder: "Paste your API key here",
                className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              })
            ),
            error && React.createElement("p", { className: "text-sm text-red-500" }, error)
          )
        )
      ),
      React.createElement("div", { className: "p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-right" },
        React.createElement("button", {
          onClick: handleConnect,
          className: "px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        }, "Connect Site")
      )
    )
  );
};

export default ConnectionWizard;
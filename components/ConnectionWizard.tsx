import React, { useState, useEffect } from 'react';

interface ConnectionWizardProps {
  onConnect: (siteUrl: string, apiKey: string) => void;
  onClose: () => void;
}

const pluginCode = `<?php
/**
 * Plugin Name:       Order Manager Connector
 * Description:       Connects your WooCommerce store to the E-commerce Order Manager application.
 * Version:           1.2.0
 * Author:            AI Assistant
 * License:           GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// NUCLEAR OPTION FOR CORS
// Hooking into plugins_loaded ensures we run before almost anything else
add_action('plugins_loaded', 'omc_handle_cors_early', 1);
function omc_handle_cors_early() {
    // Only run if this looks like a request to our API
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'order-manager/v1') !== false) {
        
        // Allow from any origin for now to fix the user's issue. 
        // In production, you might restrict this, but for this use-case, availability is key.
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
        
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce");
        
        // If it's a preflight check, kill it successfully immediately
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            status_header(200);
            exit();
        }
    }
}

// Check if WooCommerce is active
if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    return;
}

define('OMC_API_KEY_OPTION', 'omc_api_key');

// Generate a secure API key on plugin activation
register_activation_hook(__FILE__, 'omc_activate');
function omc_activate() {
    if (!get_option(OMC_API_KEY_OPTION)) {
        omc_generate_api_key();
    }
}

// Clean up on deactivation
register_deactivation_hook(__FILE__, 'omc_deactivate');
function omc_deactivate() {
    delete_option(OMC_API_KEY_OPTION);
}

// Helper to generate and store a new API key
function omc_generate_api_key() {
    $api_key = 'omc_key_' . wp_generate_password(40, false);
    update_option(OMC_API_KEY_OPTION, $api_key);
    return $api_key;
}

// Add admin menu page
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

// Admin page content
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
        
        <div class="card" style="max-width: 600px; padding: 20px;">
            <h2 style="margin-top: 0;">Connection Details</h2>
            <table class="form-table">
                <tbody>
                    <tr>
                        <th scope="row"><label for="omc_site_url">Site URL</label></th>
                        <td>
                            <input type="text" id="omc_site_url" readonly value="<?php echo esc_attr(get_site_url()); ?>" class="regular-text" onclick="this.select();">
                            <p class="description">Copy this URL into the "Site URL" field.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="omc_api_key">API Key</label></th>
                        <td>
                            <input type="text" id="omc_api_key" readonly value="<?php echo esc_attr($api_key); ?>" class="regular-text" onclick="this.select();">
                            <p class="description">Copy this key into the "API Key" field.</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <hr>
        
        <form method="post" action="">
            <?php wp_nonce_field('omc_generate_key_nonce'); ?>
            <p>If you believe your API key has been compromised, you can generate a new one.</p>
            <p class="submit">
                <button type="submit" name="omc_generate_new_key" class="button button-secondary">Generate New API Key</button>
            </p>
        </form>
    </div>
    <?php
}

// Register REST API routes
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

// Permission check for all endpoints
function omc_check_api_key(WP_REST_Request $request) {
    $auth_header = $request->get_header('Authorization');
    $stored_key = get_option(OMC_API_KEY_OPTION);

    if (!$auth_header || !$stored_key) {
        // Fallback: check query parameter if header is stripped by server
        if (isset($_GET['api_key'])) {
            return hash_equals($stored_key, $_GET['api_key']);
        }
        return false;
    }

    // Check for "Bearer <key>" format
    if (preg_match('/^Bearer\\s+(.*)$/i', $auth_header, $matches)) {
        $submitted_key = $matches[1];
        return hash_equals($stored_key, $submitted_key);
    }
    
    return false;
}


// Format a single WC_Order object for the API response
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
    
    // Map WooCommerce status to the app's status enum
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

    // Get shipping address, fallback to billing address
    $address_obj = $order->get_address('shipping');
    if (empty(array_filter($address_obj))) {
        $address_obj = $order->get_address('billing');
    }

    $address_components = [
        $address_obj['first_name'] . ' ' . $address_obj['last_name'],
        $address_obj['company'],
        $address_obj['address_1'],
        $address_obj['address_2'],
        trim($address_obj['city'] . ', ' . $address_obj['state'] . ' ' . $address_obj['postcode']),
        WC()->countries->countries[$address_obj['country']] ?? $address_obj['country']
    ];

    $shipping_address_text = implode("\n", array_filter(array_map('trim', $address_components)));

    if (empty($shipping_address_text)) {
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

// Callback to get all orders
function omc_get_orders() {
    $orders_raw = wc_get_orders(['limit' => 50, 'orderby' => 'date', 'order' => 'DESC']);
    $response_data = [];
    foreach ($orders_raw as $order) {
        $response_data[] = omc_format_order_data($order);
    }
    return new WP_REST_Response($response_data, 200);
}

// Callback to update an order status
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
}`;

const ConnectionWizard: React.FC<ConnectionWizardProps> = ({ onConnect, onClose }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isMixedContentWarning, setIsMixedContentWarning] = useState(false);
  
  useEffect(() => {
     if (siteUrl && siteUrl.startsWith('http:') && window.location.protocol === 'https:') {
         setIsMixedContentWarning(true);
     } else {
         setIsMixedContentWarning(false);
     }
  }, [siteUrl]);

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
    
    // Prepend https:// if no protocol is present
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch (_) {
      setError('Please enter a valid Site URL (e.g., https://example.com).');
      return;
    }

    if (url.startsWith('http:') && window.location.protocol === 'https:') {
        setError('Security Error: You cannot connect an HTTP site to this HTTPS app. Browsers block "Mixed Content". Please enable SSL on your website.');
        return;
    }
    
    setError('');
    onConnect(url, key);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Your WordPress Site</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              aria-label="Close connection wizard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Step 1: Install Updated Plugin</h3>
            <div className="mt-2 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg text-gray-700 dark:text-gray-300 text-sm space-y-2">
               <p>1. <strong>Download</strong> the new v1.2.0 plugin below.</p>
               <p>2. In your WordPress admin, go to <strong>Plugins</strong>.</p>
               <p>3. <span className="text-red-600 font-bold">Deactivate and Delete</span> the old "Order Manager Connector" plugin.</p>
               <p>4. Click <strong>Add New &gt; Upload Plugin</strong> and install this new file.</p>
               <div className="text-green-700 dark:text-green-400 font-medium bg-white dark:bg-gray-800 p-2 rounded border border-green-200 dark:border-green-900/50 mt-2">
                 <span className="font-bold">New in v1.2.0:</span> Fixes "Failed to fetch" and blocked connection errors by forcing correct permissions.
               </div>
            </div>
            <button 
              onClick={handleDownloadPlugin}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Plugin (v1.2.0)
            </button>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Step 2: Enter Connection Details</h3>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              After activating the plugin, go to the <strong>"Order Manager"</strong> menu in your WordPress dashboard.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site URL</label>
                <input
                  type="text"
                  id="siteUrl"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://your-wordpress-site.com"
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white ${isMixedContentWarning ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 dark:border-gray-600'}`}
                />
                 {isMixedContentWarning && (
                     <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                         Warning: Your URL starts with 'http'. This app requires 'https' (SSL) to work correctly.
                     </p>
                 )}
              </div>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                <input
                  type="text"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="omc_key_..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-right">
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Connect Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionWizard;
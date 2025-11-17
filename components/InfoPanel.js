import React from 'react';

const FeatureCard = ({ icon, title, children }) => (
    React.createElement("div", { className: "flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg" },
        React.createElement("div", { className: "flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" },
            icon
        ),
        React.createElement("h3", { className: "mt-4 text-lg font-semibold text-gray-900 dark:text-white" }, title),
        React.createElement("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400" }, children)
    )
);

const InfoPanel = ({ onConnectClick }) => {
  return React.createElement("div", { className: "bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mt-8" },
    React.createElement("div", { className: "p-8 md:p-12" },
      React.createElement("div", { className: "text-center" },
        React.createElement("h2", { className: "text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl" },
          "Welcome to Your E-commerce Command Center"
        ),
        React.createElement("p", { className: "mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto" },
          "This application provides a modern, fast, and user-friendly interface to manage your WooCommerce orders. Get started by connecting to your WordPress site."
        )
      ),

      React.createElement("div", { className: "mt-12 grid grid-cols-1 md:grid-cols-3 gap-8" },
        React.createElement(FeatureCard, { 
          icon: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6h16M4 10h16M4 14h16M4 18h16" })),
          title: "Centralized Management"
        }, "View and update all your orders from a single, clean dashboard, separate from the WordPress admin area."),
        React.createElement(FeatureCard, { 
          icon: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" })),
          title: "Instant Updates"
        }, "Change order statuses with a single click. The changes are instantly reflected in your WooCommerce store."),
        React.createElement(FeatureCard, { 
          icon: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" })),
          title: "Secure Connection"
        }, "Your data is kept safe using a secure, token-based API connection between this app and your store.")
      ),
      
      React.createElement("div", { className: "mt-12 text-center bg-gray-100 dark:bg-gray-900/50 p-8 rounded-lg" },
        React.createElement("h3", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, "How It Works"),
        React.createElement("p", { className: "mt-4 max-w-3xl mx-auto text-gray-600 dark:text-gray-400" },
          "This is a \"headless\" application, meaning it's a frontend interface that communicates with your WordPress backend. To enable this, you'll need to install a small, custom plugin on your site. This plugin creates a secure REST API endpoint that this application uses to fetch and update order data."
        ),
        React.createElement("div", { className: "mt-6" },
          React.createElement("button", { 
            onClick: onConnectClick,
            className: "px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-transform transform hover:scale-105"
          }, "Connect Your Site Now")
        )
      ),

      React.createElement("div", { className: "mt-12 text-center" },
        React.createElement("h4", { className: "font-semibold text-gray-800 dark:text-gray-200" }, "Powered by Modern Technology"),
        React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1" },
          "Built with React & Tailwind CSS. Ready for Gemini API integration for advanced features like sales forecasting and customer support automation."
        )
      )
    )
  );
};

export default InfoPanel;
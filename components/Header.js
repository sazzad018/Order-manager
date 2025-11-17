import React from 'react';

const Header = ({ isLoggedIn, onLogout, connectedSiteUrl, onSettingsClick }) => {
  const svgIcon = React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8 text-indigo-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
  );
  
  const settingsIcon = React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-6 h-6" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" })
  );

  return React.createElement("header", { className: "bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20" },
    React.createElement("div", { className: "container mx-auto px-4 md:px-8 py-4 flex justify-between items-center" },
      React.createElement("div", { className: "flex items-center space-x-3" },
        svgIcon,
        React.createElement("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, "E-commerce Order Manager")
      ),
      isLoggedIn && React.createElement("div", { className: "flex items-center space-x-4" },
        connectedSiteUrl && React.createElement("div", { className: "hidden sm:flex items-center space-x-2" },
          React.createElement("span", { className: "h-2 w-2 rounded-full bg-green-500" }),
          React.createElement("span", { className: "text-sm text-gray-500 dark:text-gray-400" }, connectedSiteUrl)
        ),
        React.createElement("button", {
            onClick: onSettingsClick,
            className: "p-2 text-gray-500 rounded-md hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors",
            "aria-label": "Settings"
          },
          settingsIcon
        ),
        React.createElement("button", {
            onClick: onLogout,
            className: "px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-700 transition-colors"
          },
          "Logout"
        )
      )
    )
  );
};

export default Header;
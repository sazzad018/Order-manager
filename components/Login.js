import React from 'react';

const Login = ({ onLogin }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };
  
  const icon = React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-10 w-10 text-indigo-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
  );

  return React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900" },
    React.createElement("div", { className: "w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl" },
      React.createElement("div", { className: "text-center" },
        React.createElement("div", { className: "flex items-center justify-center space-x-3 mb-4" },
          icon,
          React.createElement("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white" }, "Order Manager")
        ),
        React.createElement("p", { className: "mt-2 text-gray-500 dark:text-gray-400" }, "Sign in to manage your client's orders")
      ),
      React.createElement("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit },
        React.createElement("div", { className: "rounded-md shadow-sm -space-y-px" },
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "email-address", className: "sr-only" }, "Email address"),
            React.createElement("input", {
              id: "email-address",
              name: "email",
              type: "email",
              autoComplete: "email",
              required: true,
              className: "appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
              placeholder: "Email address (any will work)",
              defaultValue: "client@example.com"
            })
          ),
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "password", className: "sr-only" }, "Password"),
            React.createElement("input", {
              id: "password",
              name: "password",
              type: "password",
              autoComplete: "current-password",
              required: true,
              className: "appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
              placeholder: "Password (any will work)",
              defaultValue: "password"
            })
          )
        ),
        React.createElement("div", null,
          React.createElement("button", {
            type: "submit",
            className: "group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          }, "Sign in")
        )
      )
    )
  );
};

export default Login;
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                planner: {
                    bg: '#f8f9fa',
                    paper: '#ffffff',
                    accent: '#4f46e5',
                }
            },
            boxShadow: {
                '3d': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), inset 0 -2px 4px 0 rgb(0 0 0 / 0.06)',
            }
        },
    },
    plugins: [],
}

# Zoabi Planner Pro

A high-performance, web-based digital planner that replicates the tactile, organized feel of a physical binder with AI-assisted productivity features.

## Features

### ✅ Implemented
- **Dashboard**: Beautiful 3D planner cards with binder ring effects
- **Planner Creation Wizard**: 3-step wizard for creating new planners
- **Canvas Workspace**: High-performance drawing canvas with multiple tools
- **Template Library**: Browse and insert templates into your planner
- **Navigation**: Seamless routing between dashboard and workspace
- **Drawing Tools**: Pen, highlighter, eraser with customizable colors and sizes

### 🚧 In Progress
- Canvas state persistence to Supabase
- Text element creation and editing
- Sticker library integration
- AI handwriting-to-text conversion

### 📋 Planned
- Authentication with Supabase Auth
- PDF import and export
- Real-time collaboration
- Voice input
- Mobile-responsive design

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Canvas**: React-Konva
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Routing**: React Router v6

## Getting Started

### Prerequisites
- Node.js 18+ and npm installed
- Supabase account

### Installation

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

3. Set up the database:
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Run the SQL from `supabase_schema.sql` in the SQL Editor

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
src/
├── components/
│   ├── canvas/          # Canvas workspace and drawing tools
│   ├── dashboard/       # Home dashboard and planner cards
│   ├── wizard/          # Planner creation wizard
│   ├── library/         # Template and asset libraries
│   └── ui/              # Reusable UI components
├── lib/                 # Supabase client
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT

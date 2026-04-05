# DSIMS - Shopkeeper Inventory Management System

A desktop web application for shopkeepers to manage inventory, generate invoices, and track sales analytics. Data is stored locally on your PC using SQLite database.

## Features

- 🔐 User authentication (signup/login)
- 🏪 Shop profile management
- 📦 Product inventory management
- 🧾 Invoice generation and printing
- 📊 Sales analytics and charts
- 💾 Local data storage (SQLite database)
- 🖥️ Desktop application (Electron wrapper)

## Installation & Setup

### Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Step 1: Install Dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install:
- Express (web server)
- SQLite (database)
- Electron (desktop app wrapper)
- Other required packages

### Step 2: Run the Application

You have two options:

#### Option A: Run as Web Application (Development)

```bash
npm start
```

Then open your browser and go to: `http://localhost:3000`

#### Option B: Run as Desktop Application (Electron)

```bash
npm run electron
```

This will open the application in a desktop window.

### Step 3: First Time Setup

1. **Sign Up**: Create a new account with your email and password
2. **Shop Setup**: Enter your shop details (name, owner, category, currency)
3. **Add Products**: Add your initial inventory items
4. **Start Using**: Navigate to Dashboard to manage inventory and generate invoices

## Building for Distribution

To create an installable desktop application:

### Windows
```bash
npm run build-win
```

### macOS
```bash
npm run build-mac
```

### Linux
```bash
npm run build-linux
```

The built application will be in the `dist` folder.

## Data Storage

- **Database Location**: `data/dsims.db` (SQLite file)
- All your data (users, products, invoices, analytics) is stored locally on your PC
- The database file is created automatically on first run
- **Backup**: Copy the `data` folder to backup your data

## Project Structure

```
├── server.js              # Express backend server
├── main.js                # Electron main process
├── package.json           # Dependencies and scripts
├── data/                  # SQLite database (created automatically)
├── js/
│   ├── storage-api.js     # API client (replaces localStorage)
│   ├── auth.js            # Authentication logic
│   ├── invoice.js         # Invoice generation
│   ├── dashboard.js       # Dashboard and inventory
│   └── setup.js           # Initial setup
├── css/                   # Stylesheets
├── assets/                # Images and icons
└── *.html                 # HTML pages

```

## API Endpoints

The backend provides REST API endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/current` - Get current user
- `GET /api/shop` - Get shop details
- `POST /api/shop` - Save shop details
- `GET /api/products` - Get all products
- `POST /api/products` - Add product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/generate-number` - Generate invoice number
- `GET /api/analytics` - Get analytics data

## Troubleshooting

### Port 3000 already in use
Change the port in `server.js` (line 7) to a different number (e.g., 3001).

### Database errors
- Make sure the `data` folder exists (it's created automatically)
- Check file permissions on the `data` folder
- Delete `data/dsims.db` to reset the database (you'll lose all data)

### Electron app won't start
- Make sure you ran `npm install` first
- Try running `npm start` first to test the web version
- Check that Node.js is installed correctly: `node --version`

## Development

### Running in Development Mode

```bash
npm run dev
```

### Making Changes

- Frontend files: Edit HTML/CSS/JS files in the project root
- Backend API: Edit `server.js`
- Database schema: Modify `initDatabase()` function in `server.js`

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues or questions, check the code comments or modify as needed for your specific requirements.

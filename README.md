# MoneyGestor - Personal Finance Management

MoneyGestor is a comprehensive application for managing personal and household finances. It allows you to track transactions, manage wallets, categorize expenses, and maintain complete control over your money.

## 📋 Project Overview

The project is structured as a modern full-stack application:

- **Backend**: ASP.NET Core 8.0 REST API
- **Frontend**: Next.js (React) with TypeScript
- **Database**: MySQL
- **Additional Tools**: Console application for CSV data import/export

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- `settings.json` file configured in `./settings.json`

### Starting the Application

```bash
# Start all services (backend, frontend, database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health (if implemented)

## ⚙️ Configuration

### settings.json File

The main configuration file is located at: `./settings.json`

Configuration example:

```json
{
  "log": {
    "level": "Information",
    "output": {
      "console": true,
      "file": {
        "path": "../log/backend/",
        "fileName": "backend"
      }
    }
  },
  "database": {
    "name": "db_name",
    "user": "db_user_name",
    "password": "db_user_password",
    "forceUpdate": true
  }
}
```

**Warning**: Before running with Docker, update the database credentials in `settings.json` with secure values for the production environment.

### Environment Variables

In `docker-compose.yml` are defined:
- `ASPNETCORE_ENVIRONMENT=Production` (backend)
- `NODE_ENV=production` (frontend)

## 🛠️ Local Development

### Backend (ASP.NET Core)

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project webserver/webserver.csproj
```

The backend will be available at http://localhost:5000

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### Tests

```bash
cd backend
dotnet test
```

## 📦 Additional Tools

### CSV Export/Import

The application includes a CLI tool for exporting and importing data in CSV format.

Start with the 'tools' profile:

```bash
docker-compose --profile tools up exportimport
```

## 🐳 Docker Services

### Backend (webserver)
- Port: 5000:8080
- Image: mcr.microsoft.com/dotnet/aspnet:8.0
- Volumes:
  - `settings.json` → `/app/settings.json` (read-only)
  - Log directory → `/app/log`

### Frontend
- Port: 3000:3000
- Image: node:22-alpine
- Multi-stage build for optimization

### Export/Import Tool
- Profile: tools (not started by default)
- Runtime: .NET 8.0

## 🐛 Troubleshooting

### Container fails to start
```bash
# Check logs
docker-compose logs backend

# Verify settings.json file
cat backend/webserver/settings.json
```

### Port already in use
```bash
# Change ports in docker-compose.yml
# Example: "5001:8080" for backend
```

### Database connection error
```bash
# Verify credentials in settings.json
# Ensure the database is reachable
docker-compose logs backend | grep -i database
```

## 📖 Useful Commands

```bash
# View container status
docker-compose ps

# Rebuild images
docker-compose build

# Clean up everything (containers, volumes, networks)
docker-compose down -v

# Execute a command in a container
docker-compose exec backend dotnet --version

# View logs for a specific service
docker-compose logs -f frontend
```

---

**Last updated**: June 2026

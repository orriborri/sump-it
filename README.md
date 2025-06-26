# Sump It - Coffee Brewing App

A comprehensive coffee brewing application built with Next.js, TypeScript, and PostgreSQL.

## ☕ Features

- **Brewing Workflow**: Step-by-step coffee brewing process
- **Smart Recommendations**: AI-powered brewing suggestions based on previous brews
- **Grinder Management**: Custom grinder settings with min/max/step configurations
- **Brew Tracking**: Track and rate your coffee brews
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd sump-it
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database URL
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   npm run generate-models
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Docker Development

1. **Run with Docker Compose:**
   ```bash
   npm run docker:compose
   ```

2. **Access the application:**
   - App: http://localhost:3000
   - Database: localhost:5432

3. **Stop services:**
   ```bash
   npm run docker:compose:down
   ```

## 🐳 Docker Commands

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Run with Docker Compose (includes PostgreSQL)
npm run docker:compose

# Stop Docker Compose
npm run docker:compose:down
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run migrate` - Run database migrations
- `npm run generate-models` - Generate database models

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Material-UI (MUI)
- **Database**: PostgreSQL with Kysely query builder
- **Deployment**: Docker, GitHub Actions

## 📊 API Endpoints

- `GET /api/health` - Health check endpoint
- Various server actions for data management

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options

- **Railway**: Connect GitHub repo and deploy
- **Vercel**: Connect GitHub repo with PostgreSQL addon
- **DigitalOcean**: Use App Platform with managed database
- **Docker**: Use provided Dockerfile and docker-compose.yml

## 🔒 Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🧪 Testing

```bash
npm test
```

## 📝 Database Schema

The app uses PostgreSQL with the following main tables:
- `beans` - Coffee bean information
- `methods` - Brewing methods
- `grinders` - Grinder configurations
- `brews` - Individual brew records
- `brew_feedback` - Brew ratings and feedback

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Attributions

Coffee Machine by Creative Stall from [Noun Project](https://thenounproject.com/browse/icons/term/coffee-machine/) (CC BY 3.0)
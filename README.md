# Sump It - Coffee Brewing App

A comprehensive coffee brewing application built with Next.js, TypeScript, and PostgreSQL, featuring an **integrated vertical stepper** for the perfect brewing experience.

## ☕ Features

- **Integrated Vertical Stepper**: Unique single-column brewing workflow with form content between step numbers
- **Smart Recommendations**: AI-powered brewing suggestions based on previous brews
- **Grinder Management**: Custom grinder settings with min/max/step configurations
- **Brew Tracking**: Track and rate your coffee brews
- **Coffee Theme**: Beautiful brown color scheme throughout
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🎨 Design Philosophy

### Integrated Vertical Stepper
This app features a unique **integrated vertical stepper** design where:
- Form content appears directly between step numbers
- Single vertical flow from top to bottom
- Progressive disclosure (only current step shows content)
- Coffee-themed instructions and status indicators
- Smooth animations and transitions

**3-Step Brewing Workflow**:
```
● 1. Equipment Selection    [Current Step]
    Select bean, method, and grinder...
    ┌─────────────────────────────────┐
    │     Bean + Method + Grinder     │
    └─────────────────────────────────┘
│
○ 2. Brewing Parameters
    Coffee amount, grind setting, ratio...
    Shows previous brew feedback
│
○ 3. Brew & Rate
    Start brewing and rate results
```

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

6. **Visit the brewing interface:**
   - App: http://localhost:3000
   - Brewing: http://localhost:3000/brew

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

## 🏗️ Architecture

### Vertical Stepper Components
- **`Step.tsx`**: Main stepper container and orchestration
- **`IntegratedVerticalStepper.tsx`**: Core stepper component with integrated forms
- **Step Components**: Individual form components for each brewing step
  - `BeanSelector.tsx` (Step 1: Equipment Selection)
  - `BrewingParameters.tsx` (Step 2: Coffee amount, grind, ratio + previous brew feedback)
  - `BrewFeedback.tsx` (Step 3: Rate brew and provide recommendations)

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Material-UI (MUI) with custom coffee theme
- **Database**: PostgreSQL with Kysely query builder
- **Deployment**: Docker, GitHub Actions

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

- **[Vertical Stepper Architecture](./docs/VERTICAL_STEPPER_ARCHITECTURE.md)**: Complete design and implementation guide
- **[Component API](./docs/COMPONENT_API.md)**: Detailed component interfaces and usage
- **[Design Decisions](./docs/DESIGN_DECISIONS.md)**: Rationale behind design choices
- **[Maintenance Guide](./docs/MAINTENANCE_GUIDE.md)**: How to maintain and update the stepper

## 🎯 Key Design Principles

### DO's ✅
- Maintain single vertical column layout
- Keep coffee theme colors (#8B4513 brown, #4CAF50 green)
- Show only current step's form content
- Use smooth 300ms transitions
- Keep 800px max-width for readability

### DON'Ts ❌
- Don't change to horizontal or sidebar layout
- Don't show multiple steps simultaneously
- Don't remove step instructions or connecting lines
- Don't change away from coffee color scheme
- Don't exceed 800px container width

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

### Testing the Vertical Stepper
When testing changes to the stepper:
- ✅ All 3 steps display correctly
- ✅ Only current step shows form content
- ✅ Smooth transitions between steps
- ✅ Coffee theme colors consistent
- ✅ Mobile responsive layout
- ✅ Form validation works
- ✅ Navigation buttons function properly

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
3. Make your changes (following the maintenance guide)
4. Run tests and linting
5. Submit a pull request

**Important**: When modifying the vertical stepper, please review the [Maintenance Guide](./docs/MAINTENANCE_GUIDE.md) to ensure design consistency.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Attributions

Coffee Machine by Creative Stall from [Noun Project](https://thenounproject.com/browse/icons/term/coffee-machine/) (CC BY 3.0)

## 🎨 Design Status

**Vertical Stepper**: ✅ **Production Ready**  
**Design Approval**: ✅ **User Approved**  
**Documentation**: ✅ **Complete**  
**Maintenance Guide**: ✅ **Available**

The integrated vertical stepper design is the approved and documented approach for this application. Any changes should follow the maintenance guidelines to preserve the user experience and design consistency.
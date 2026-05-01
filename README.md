# Team Task Manager

A full-stack assignment project with authentication, project teams, role-based access, task assignment, task status tracking, and a dashboard.

## Stack

- React + Vite frontend
- Express REST API
- MongoDB database
- Mongoose ODM
- JWT authentication
- Railway deployment ready

## Run Locally In VS Code

1. Install Node.js LTS from `https://nodejs.org`.
2. Open this folder in VS Code.
3. Create `server/.env` by copying `server/.env.example`.
4. Add a MongoDB connection string to `MONGODB_URI`.
5. Run:

```bash
npm install
npm run db:seed
npm run dev
```

On Windows PowerShell, you can create the env file with:

```powershell
Copy-Item server/.env.example server/.env
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000/api`

Seed admin:

- Email: `admin@example.com`
- Password: `Admin@12345`

## Railway Deployment

1. Push this project to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Create a free MongoDB Atlas cluster and copy its connection string.
4. Add these service variables:

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/team-task-manager
JWT_SECRET=your-long-production-secret
CLIENT_URL=https://your-railway-app-url.up.railway.app
NODE_ENV=production
```

5. This repo includes `railway.json`, so Railway will build with `npm run build`, start with `npm start`, and health-check `/api/health`.
6. Open the generated Railway URL and test signup/login.

## Role Rules

- Global `ADMIN` users can create projects and view all projects.
- Project admins can manage team members and create/update/delete tasks in their project.
- Members can view assigned project tasks and update task status.

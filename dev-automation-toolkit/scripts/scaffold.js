#!/usr/bin/env node

/**
 * 🚀 Project Scaffolder - One-command project setup
 * 
 * Usage: node scaffold.js <template> <project-name>
 * 
 * Templates: nextjs, react, express, python-fastapi, vue
 * 
 * Example: node scaffold.js nextjs my-saas-app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  nextjs: {
    name: 'Next.js + Tailwind + TypeScript',
    description: 'Full-stack React framework with Tailwind CSS',
    steps: [
      { cmd: 'npx create-next-app@latest {name} --typescript --tailwind --eslint --app --src-dir', desc: 'Creating Next.js app' },
      { cmd: 'cd {name} && npm install prisma @prisma/client', desc: 'Installing Prisma' },
      { cmd: 'cd {name} && npx prisma init', desc: 'Initializing Prisma' },
    ],
    files: {
      '{name}/src/lib/db.ts': `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`,
      '{name}/src/app/api/health/route.ts': `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
`,
      '{name}/.env.example': `DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
`,
    },
    postSteps: [
      '✅ Project created! Next steps:',
      '  cd {name}',
      '  cp .env.example .env',
      '  npm run dev',
    ],
  },

  react: {
    name: 'React + Vite + TypeScript',
    description: 'Fast React development with Vite',
    steps: [
      { cmd: 'npm create vite@latest {name} -- --template react-ts', desc: 'Creating Vite React app' },
      { cmd: 'cd {name} && npm install', desc: 'Installing dependencies' },
      { cmd: 'cd {name} && npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p', desc: 'Setting up Tailwind' },
    ],
    files: {
      '{name}/src/App.tsx': `import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🚀 Ready to Build</h1>
        <p className="text-gray-400 mb-8">Edit src/App.tsx to get started</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition"
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
}

export default App;
`,
    },
    postSteps: [
      '✅ React app created! Next steps:',
      '  cd {name}',
      '  npm run dev',
    ],
  },

  express: {
    name: 'Express + TypeScript API',
    description: 'Production-ready Express API with TypeScript',
    steps: [
      { cmd: 'mkdir -p {name} && cd {name} && npm init -y', desc: 'Initializing project' },
      { cmd: 'cd {name} && npm install express cors helmet morgan compression dotenv', desc: 'Installing dependencies' },
      { cmd: 'cd {name} && npm install -D typescript @types/express @types/node ts-node nodemon', desc: 'Installing dev dependencies' },
    ],
    files: {
      '{name}/tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`,
      '{name}/src/server.ts': `import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});

export default app;
`,
      '{name}/.env.example': `PORT=3000
NODE_ENV=development
DATABASE_URL=""
`,
    },
    postSteps: [
      '✅ Express API created! Next steps:',
      '  cd {name}',
      '  cp .env.example .env',
      '  Add to package.json scripts: "dev": "nodemon src/server.ts"',
      '  npm run dev',
    ],
  },

  'python-fastapi': {
    name: 'Python FastAPI',
    description: 'High-performance Python API with FastAPI',
    steps: [
      { cmd: 'mkdir -p {name}', desc: 'Creating directory' },
    ],
    files: {
      '{name}/requirements.txt': `fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
python-dotenv==1.0.0
httpx==0.26.0
`,
      '{name}/src/main.py': `from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

app = FastAPI(title="API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

class ItemCreate(BaseModel):
    name: str
    description: str = ""

items_db = []

@app.post("/api/items")
async def create_item(item: ItemCreate):
    new_item = {"id": len(items_db) + 1, **item.dict(), "created_at": datetime.utcnow().isoformat()}
    items_db.append(new_item)
    return new_item

@app.get("/api/items")
async def list_items():
    return items_db

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`,
      '{name}/.env.example': `DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-me-in-production
`,
    },
    postSteps: [
      '✅ FastAPI project created! Next steps:',
      '  cd {name}',
      '  python -m venv venv',
      '  source venv/bin/activate  # or venv\\Scripts\\activate on Windows',
      '  pip install -r requirements.txt',
      '  python src/main.py',
    ],
  },

  vue: {
    name: 'Vue 3 + Vite + TypeScript',
    description: 'Modern Vue 3 app with Composition API',
    steps: [
      { cmd: 'npm create vue@latest {name} -- --typescript --router --pinia --eslint', desc: 'Creating Vue app' },
      { cmd: 'cd {name} && npm install', desc: 'Installing dependencies' },
    ],
    files: {},
    postSteps: [
      '✅ Vue app created! Next steps:',
      '  cd {name}',
      '  npm run dev',
    ],
  },
};

// Main
const [,, template, projectName] = process.argv;

if (!template || !projectName) {
  console.log('\n🚀 Project Scaffolder\n');
  console.log('Usage: node scaffold.js <template> <project-name>\n');
  console.log('Available templates:');
  Object.entries(TEMPLATES).forEach(([key, t]) => {
    console.log(`  ${key.padEnd(16)} ${t.description}`);
  });
  console.log('\nExample: node scaffold.js nextjs my-saas-app\n');
  process.exit(0);
}

const tmpl = TEMPLATES[template];
if (!tmpl) {
  console.error(`❌ Unknown template: ${template}`);
  console.log(`Available: ${Object.keys(TEMPLATES).join(', ')}`);
  process.exit(1);
}

console.log(`\n🚀 Scaffolding: ${tmpl.name}`);
console.log(`📁 Project: ${projectName}\n`);

// Run steps
for (const step of tmpl.steps) {
  console.log(`⏳ ${step.desc}...`);
  const cmd = step.cmd.replace(/{name}/g, projectName);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Failed: ${cmd}`);
    process.exit(1);
  }
}

// Create files
for (const [filePath, content] of Object.entries(tmpl.files || {})) {
  const resolved = filePath.replace(/{name}/g, projectName);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, content);
  console.log(`📄 Created: ${resolved}`);
}

// Post steps
console.log('\n');
tmpl.postSteps.forEach(s => console.log(s.replace(/{name}/g, projectName)));
console.log('');

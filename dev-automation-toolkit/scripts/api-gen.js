#!/usr/bin/env node

/**
 * 📊 Quick API Generator
 * 
 * Generate a full CRUD API from a JSON schema definition
 * 
 * Usage: node api-gen.js schema.json
 * 
 * Schema format:
 * {
 *   "name": "Product",
 *   "fields": {
 *     "name": "string",
 *     "price": "number",
 *     "inStock": "boolean"
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const [,, schemaFile] = process.argv;

if (!schemaFile) {
  console.log(`
📊 Quick API Generator

Usage: node api-gen.js schema.json

Schema format:
{
  "name": "Product",
  "fields": {
    "name": "string",
    "price": "number",
    "inStock": "boolean",
    "tags": "string[]"
  }
}
`);
  process.exit(0);
}

const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
const { name, fields } = schema;
const lowerName = name.toLowerCase();
const pluralName = lowerName + 's';

// Generate TypeScript interface
function generateInterface() {
  const fieldEntries = Object.entries(fields).map(([key, type]) => {
    return `  ${key}: ${type};`;
  }).join('\n');

  return `export interface ${name} {
  id: string;
${fieldEntries}
  createdAt: string;
  updatedAt: string;
}

export interface Create${name}Input {
${Object.entries(fields).map(([key, type]) => `  ${key}: ${type};`).join('\n')}
}

export interface Update${name}Input {
${Object.entries(fields).map(([key, type]) => `  ${key}?: ${type};`).join('\n')}
}
`;
}

// Generate Express routes
function generateRoutes() {
  return `import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { ${name}, Create${name}Input, Update${name}Input } from "./types";

const router = Router();
const ${pluralName}: ${name}[] = [];

// List all ${pluralName}
router.get("/api/${pluralName}", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const start = (page - 1) * limit;
  
  res.json({
    data: ${pluralName}.slice(start, start + limit),
    total: ${pluralName}.length,
    page,
    limit,
  });
});

// Get single ${lowerName}
router.get("/api/${pluralName}/:id", (req: Request, res: Response) => {
  const item = ${pluralName}.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "${name} not found" });
  res.json({ data: item });
});

// Create ${lowerName}
router.post("/api/${pluralName}", (req: Request, res: Response) => {
  const input: Create${name}Input = req.body;
  const item: ${name} = {
    id: uuidv4(),
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ${pluralName}.push(item);
  res.status(201).json({ data: item });
});

// Update ${lowerName}
router.put("/api/${pluralName}/:id", (req: Request, res: Response) => {
  const index = ${pluralName}.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "${name} not found" });
  
  const input: Update${name}Input = req.body;
  ${pluralName}[index] = {
    ...${pluralName}[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  res.json({ data: ${pluralName}[index] });
});

// Delete ${lowerName}
router.delete("/api/${pluralName}/:id", (req: Request, res: Response) => {
  const index = ${pluralName}.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "${name} not found" });
  
  ${pluralName}.splice(index, 1);
  res.json({ message: "${name} deleted" });
});

export default router;
`;
}

// Generate validation middleware
function generateValidation() {
  const checks = Object.entries(fields).map(([key, type]) => {
    if (type === 'string') return `    if (typeof body.${key} !== "string") errors.push("${key} must be a string");`;
    if (type === 'number') return `    if (typeof body.${key} !== "number") errors.push("${key} must be a number");`;
    if (type === 'boolean') return `    if (typeof body.${key} !== "boolean") errors.push("${key} must be a boolean");`;
    return `    // ${key}: ${type} - add custom validation`;
  }).join('\n');

  return `import { Request, Response, NextFunction } from "express";

export function validateCreate${name}(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const errors: string[] = [];

${checks}

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
}
`;
}

// Write files
const outputDir = path.join(process.cwd(), `${pluralName}-api`);
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(path.join(outputDir, 'types.ts'), generateInterface());
fs.writeFileSync(path.join(outputDir, 'routes.ts'), generateRoutes());
fs.writeFileSync(path.join(outputDir, 'validation.ts'), generateValidation());

// Generate schema for documentation
fs.writeFileSync(path.join(outputDir, 'schema.json'), JSON.stringify(schema, null, 2));

console.log(`\n✅ Generated ${name} API files in ${pluralName}/`);
console.log(`   📄 types.ts       — TypeScript interfaces`);
console.log(`   📄 routes.ts      — Express CRUD routes`);
console.log(`   📄 validation.ts  — Input validation middleware`);
console.log(`   📄 schema.json    — Original schema`);
console.log(`\n🔌 To use, import routes.ts in your Express app.`);

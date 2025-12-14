import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with RBAC
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "admin", "member", "viewer"] }).notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = User["role"];

// Organizations
export const orgs = pgTable("orgs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrgSchema = createInsertSchema(orgs).omit({
  id: true,
  createdAt: true,
});

export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Org = typeof orgs.$inferSelect;

// Projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Integrations
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, anthropic, github, etc.
  status: text("status", { enum: ["connected", "syncing", "disconnected", "error"] }).notNull().default("disconnected"),
  metadataJson: jsonb("metadata_json"), // provider-specific config
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

// Secret references (not actual secrets - just pointers to Replit Secrets)
export const secretsRef = pgTable("secrets_ref", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  secretName: text("secret_name").notNull(), // e.g., "OPENAI_API_KEY"
  scopesJson: jsonb("scopes_json"), // provider-specific scopes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSecretRefSchema = createInsertSchema(secretsRef).omit({
  id: true,
  createdAt: true,
});

export type InsertSecretRef = z.infer<typeof insertSecretRefSchema>;
export type SecretRef = typeof secretsRef.$inferSelect;

// Agent runs
export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["queued", "running", "completed", "failed", "cancelled"] }).notNull().default("queued"),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  inputJson: jsonb("input_json"),
  outputJson: jsonb("output_json"),
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agentRunId: varchar("agent_run_id").references(() => agentRuns.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "orchestrator"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Memory items
export const memoryItems = pgTable("memory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "note", "document", "link", etc.
  source: text("source").notNull(), // "manual", "notion", "drive", etc.
  content: text("content").notNull(),
  embeddingRef: text("embedding_ref"), // reference to external embedding storage
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemoryItemSchema = createInsertSchema(memoryItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMemoryItem = z.infer<typeof insertMemoryItemSchema>;
export type MemoryItem = typeof memoryItems.$inferSelect;

// Audit log
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detailJson: jsonb("detail_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Budgets
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  period: text("period", { enum: ["daily", "monthly"] }).notNull(),
  limitUsd: decimal("limit_usd", { precision: 10, scale: 2 }).notNull(),
  spentUsd: decimal("spent_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// API Keys for external integrations (Zapier, etc)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// User Credentials (encrypted API keys per user)
export const userCredentials = pgTable("user_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, anthropic, perplexity, xai, github, etc.
  encryptedKey: text("encrypted_key").notNull(), // AES-256-GCM encrypted API key
  iv: text("iv").notNull(), // Initialization vector for decryption
  authTag: text("auth_tag").notNull(), // Authentication tag for AES-GCM
  label: text("label"), // User-friendly label
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserCredentialSchema = createInsertSchema(userCredentials).omit({
  id: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type UserCredential = typeof userCredentials.$inferSelect;

// Usage tracking for cost estimates
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCostUsd: decimal("estimated_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  metadata: jsonb("metadata"), // Additional context (agent run id, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;

// Decision Traces - log every agent step with reasoning
export const decisionTraces = pgTable("decision_traces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentRunId: varchar("agent_run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  stepType: text("step_type", { 
    enum: ["provider_selection", "retry", "fallback", "model_selection", "context_analysis", "tool_call", "response_generation", "error_handling"] 
  }).notNull(),
  decision: text("decision").notNull(),
  reasoning: text("reasoning").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  alternatives: jsonb("alternatives"),
  contextUsed: jsonb("context_used"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDecisionTraceSchema = createInsertSchema(decisionTraces).omit({
  id: true,
  createdAt: true,
});

export type InsertDecisionTrace = z.infer<typeof insertDecisionTraceSchema>;
export type DecisionTrace = typeof decisionTraces.$inferSelect;

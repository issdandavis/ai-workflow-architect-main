import { db } from "./db";
import { 
  users, type User, type InsertUser,
  orgs, type Org, type InsertOrg,
  projects, type Project, type InsertProject,
  integrations, type Integration, type InsertIntegration,
  secretsRef, type SecretRef, type InsertSecretRef,
  agentRuns, type AgentRun, type InsertAgentRun,
  messages, type Message, type InsertMessage,
  memoryItems, type MemoryItem, type InsertMemoryItem,
  auditLog, type AuditLog, type InsertAuditLog,
  budgets, type Budget, type InsertBudget,
  apiKeys, type ApiKey, type InsertApiKey,
  userCredentials, type UserCredential, type InsertUserCredential,
  usageRecords, type UsageRecord, type InsertUsageRecord,
  decisionTraces, type DecisionTrace, type InsertDecisionTrace,
} from "@shared/schema";
import { eq, and, desc, like, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Orgs
  getOrg(id: string): Promise<Org | undefined>;
  getOrgsByUser(userId: string): Promise<Org[]>;
  createOrg(org: InsertOrg): Promise<Org>;
  
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrg(orgId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Integrations
  getIntegrations(orgId: string): Promise<Integration[]>;
  getIntegration(id: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, update: Partial<InsertIntegration>): Promise<Integration | undefined>;
  disconnectIntegration(id: string): Promise<void>;
  
  // Secret references
  getSecretRefs(orgId: string, provider?: string): Promise<SecretRef[]>;
  createSecretRef(secretRef: InsertSecretRef): Promise<SecretRef>;
  
  // Agent runs
  getAgentRun(id: string): Promise<AgentRun | undefined>;
  getAgentRunsByProject(projectId: string): Promise<AgentRun[]>;
  createAgentRun(agentRun: InsertAgentRun): Promise<AgentRun>;
  updateAgentRun(id: string, update: Partial<InsertAgentRun>): Promise<AgentRun | undefined>;
  
  // Messages
  getMessagesByProject(projectId: string): Promise<Message[]>;
  getMessagesByAgentRun(agentRunId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Memory
  getMemoryItems(projectId: string): Promise<MemoryItem[]>;
  searchMemoryItems(projectId: string, query: string): Promise<MemoryItem[]>;
  createMemoryItem(memoryItem: InsertMemoryItem): Promise<MemoryItem>;
  
  // Audit log
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(orgId: string, limit?: number): Promise<AuditLog[]>;
  
  // Budgets
  getBudget(orgId: string, period: "daily" | "monthly"): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudgetSpent(id: string, amount: string): Promise<void>;
  updateBudgetLimit(id: string, limitUsd: string): Promise<void>;
  resetBudgetSpent(id: string): Promise<void>;

  // API Keys
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getApiKeysByOrg(orgId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;

  // User Credentials (encrypted vault)
  getUserCredentials(userId: string): Promise<UserCredential[]>;
  getUserCredentialById(id: string): Promise<UserCredential | undefined>;
  getUserCredentialsByProvider(userId: string, provider: string): Promise<UserCredential | undefined>;
  createUserCredential(credential: InsertUserCredential): Promise<UserCredential>;
  updateUserCredential(id: string, update: Partial<InsertUserCredential>): Promise<UserCredential>;
  updateCredentialLastUsed(id: string): Promise<void>;
  deleteUserCredential(id: string): Promise<void>;

  // Usage Records
  createUsageRecord(record: InsertUsageRecord): Promise<UsageRecord>;
  getUsageRecords(orgId: string, since?: Date): Promise<UsageRecord[]>;
  getUserUsageRecords(userId: string, since?: Date): Promise<UsageRecord[]>;
  getUsageSummary(orgId: string, since: Date): Promise<{ totalTokens: number; totalCostUsd: number }>;

  // Decision Traces
  createDecisionTrace(trace: InsertDecisionTrace): Promise<DecisionTrace>;
  getDecisionTraces(agentRunId: string): Promise<DecisionTrace[]>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Orgs
  async getOrg(id: string): Promise<Org | undefined> {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, id));
    return org;
  }

  async getOrgsByUser(userId: string): Promise<Org[]> {
    return db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  }

  async createOrg(insertOrg: InsertOrg): Promise<Org> {
    const [org] = await db.insert(orgs).values(insertOrg).returning();
    return org;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByOrg(orgId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.orgId, orgId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  // Integrations
  async getIntegrations(orgId: string): Promise<Integration[]> {
    return db.select().from(integrations).where(eq(integrations.orgId, orgId));
  }

  async getIntegration(id: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration;
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const [integration] = await db.insert(integrations).values(insertIntegration).returning();
    return integration;
  }

  async updateIntegration(id: string, update: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [integration] = await db
      .update(integrations)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(integrations.id, id))
      .returning();
    return integration;
  }

  async disconnectIntegration(id: string): Promise<void> {
    await db
      .update(integrations)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(eq(integrations.id, id));
  }

  // Secret references
  async getSecretRefs(orgId: string, provider?: string): Promise<SecretRef[]> {
    if (provider) {
      return db
        .select()
        .from(secretsRef)
        .where(and(eq(secretsRef.orgId, orgId), eq(secretsRef.provider, provider)));
    }
    return db.select().from(secretsRef).where(eq(secretsRef.orgId, orgId));
  }

  async createSecretRef(insertSecretRef: InsertSecretRef): Promise<SecretRef> {
    const [secretRef] = await db.insert(secretsRef).values(insertSecretRef).returning();
    return secretRef;
  }

  // Agent runs
  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    const [agentRun] = await db.select().from(agentRuns).where(eq(agentRuns.id, id));
    return agentRun;
  }

  async getAgentRunsByProject(projectId: string): Promise<AgentRun[]> {
    return db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.projectId, projectId))
      .orderBy(desc(agentRuns.createdAt));
  }

  async createAgentRun(insertAgentRun: InsertAgentRun): Promise<AgentRun> {
    const [agentRun] = await db.insert(agentRuns).values(insertAgentRun).returning();
    return agentRun;
  }

  async updateAgentRun(id: string, update: Partial<InsertAgentRun>): Promise<AgentRun | undefined> {
    const [agentRun] = await db
      .update(agentRuns)
      .set(update)
      .where(eq(agentRuns.id, id))
      .returning();
    return agentRun;
  }

  // Messages
  async getMessagesByProject(projectId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.projectId, projectId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByAgentRun(agentRunId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.agentRunId, agentRunId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Memory
  async getMemoryItems(projectId: string): Promise<MemoryItem[]> {
    return db
      .select()
      .from(memoryItems)
      .where(eq(memoryItems.projectId, projectId))
      .orderBy(desc(memoryItems.createdAt));
  }

  async searchMemoryItems(projectId: string, query: string): Promise<MemoryItem[]> {
    return db
      .select()
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.projectId, projectId),
          like(memoryItems.content, `%${query}%`)
        )
      )
      .orderBy(desc(memoryItems.createdAt));
  }

  async createMemoryItem(insertMemoryItem: InsertMemoryItem): Promise<MemoryItem> {
    const [memoryItem] = await db.insert(memoryItems).values(insertMemoryItem).returning();
    return memoryItem;
  }

  // Audit log
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(insertAuditLog).returning();
    return log;
  }

  async getAuditLogs(orgId: string, limit: number = 100): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLog)
      .where(eq(auditLog.orgId, orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  // Budgets
  async getBudget(orgId: string, period: "daily" | "monthly"): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.orgId, orgId), eq(budgets.period, period)));
    return budget;
  }

  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const [budget] = await db.insert(budgets).values(insertBudget).returning();
    return budget;
  }

  async updateBudgetSpent(id: string, amount: string): Promise<void> {
    await db
      .update(budgets)
      .set({
        spentUsd: sql`${budgets.spentUsd} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id));
  }

  async updateBudgetLimit(id: string, limitUsd: string): Promise<void> {
    await db
      .update(budgets)
      .set({
        limitUsd,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id));
  }

  async resetBudgetSpent(id: string): Promise<void> {
    await db
      .update(budgets)
      .set({
        spentUsd: "0",
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id));
  }

  // API Keys
  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey;
  }

  async getApiKeysByOrg(orgId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.orgId, orgId));
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db.insert(apiKeys).values(insertApiKey).returning();
    return apiKey;
  }

  // User Credentials (encrypted vault)
  async getUserCredentials(userId: string): Promise<UserCredential[]> {
    return db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .orderBy(desc(userCredentials.createdAt));
  }

  async getUserCredentialById(id: string): Promise<UserCredential | undefined> {
    const [credential] = await db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.id, id));
    return credential;
  }

  async getUserCredentialsByProvider(userId: string, provider: string): Promise<UserCredential | undefined> {
    const [credential] = await db
      .select()
      .from(userCredentials)
      .where(and(eq(userCredentials.userId, userId), eq(userCredentials.provider, provider)));
    return credential;
  }

  async createUserCredential(credential: InsertUserCredential): Promise<UserCredential> {
    const [created] = await db.insert(userCredentials).values(credential).returning();
    return created;
  }

  async updateUserCredential(id: string, update: Partial<InsertUserCredential>): Promise<UserCredential> {
    const [updated] = await db
      .update(userCredentials)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(userCredentials.id, id))
      .returning();
    return updated;
  }

  async updateCredentialLastUsed(id: string): Promise<void> {
    await db
      .update(userCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(userCredentials.id, id));
  }

  async deleteUserCredential(id: string): Promise<void> {
    await db.delete(userCredentials).where(eq(userCredentials.id, id));
  }

  // Usage Records
  async createUsageRecord(record: InsertUsageRecord): Promise<UsageRecord> {
    const [created] = await db.insert(usageRecords).values(record).returning();
    return created;
  }

  async getUsageRecords(orgId: string, since?: Date): Promise<UsageRecord[]> {
    if (since) {
      return db
        .select()
        .from(usageRecords)
        .where(and(eq(usageRecords.orgId, orgId), gte(usageRecords.createdAt, since)))
        .orderBy(desc(usageRecords.createdAt));
    }
    return db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.orgId, orgId))
      .orderBy(desc(usageRecords.createdAt));
  }

  async getUserUsageRecords(userId: string, since?: Date): Promise<UsageRecord[]> {
    if (since) {
      return db
        .select()
        .from(usageRecords)
        .where(and(eq(usageRecords.userId, userId), gte(usageRecords.createdAt, since)))
        .orderBy(desc(usageRecords.createdAt));
    }
    return db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId))
      .orderBy(desc(usageRecords.createdAt));
  }

  async getUsageSummary(orgId: string, since: Date): Promise<{ totalTokens: number; totalCostUsd: number }> {
    const records = await db
      .select()
      .from(usageRecords)
      .where(and(eq(usageRecords.orgId, orgId), gte(usageRecords.createdAt, since)));
    
    const totalTokens = records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
    const totalCostUsd = records.reduce((sum, r) => sum + parseFloat(r.estimatedCostUsd || "0"), 0);
    
    return { totalTokens, totalCostUsd };
  }

  // Decision Traces
  async createDecisionTrace(trace: InsertDecisionTrace): Promise<DecisionTrace> {
    const [created] = await db.insert(decisionTraces).values(trace).returning();
    return created;
  }

  async getDecisionTraces(agentRunId: string): Promise<DecisionTrace[]> {
    return db
      .select()
      .from(decisionTraces)
      .where(eq(decisionTraces.agentRunId, agentRunId))
      .orderBy(decisionTraces.stepNumber);
  }
}

export const storage = new DbStorage();

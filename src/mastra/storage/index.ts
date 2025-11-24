import { PostgresStore } from "@mastra/pg";

// Create a single shared PostgreSQL storage instance
// In production, use pooled connection for better performance and reliability
const getDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/mastra";
  
  // For production deployment, use Neon pooled connection
  // Replace .us-east-2 with -pooler.us-east-2
  if (process.env.NODE_ENV === "production" && dbUrl.includes(".us-east-2")) {
    return dbUrl.replace(".us-east-2", "-pooler.us-east-2");
  }
  
  return dbUrl;
};

// Try to create PostgreSQL storage, but allow graceful fallback if connection fails
let sharedPostgresStorage: PostgresStore | undefined;

try {
  if (process.env.DATABASE_URL) {
    sharedPostgresStorage = new PostgresStore({
      connectionString: getDatabaseUrl(),
    });
  } else {
    console.warn("[Storage] DATABASE_URL not found - storage disabled (workflows won't persist)");
  }
} catch (error) {
  console.error("[Storage] Failed to initialize PostgreSQL storage:", error);
  console.warn("[Storage] Continuing without storage (workflows won't persist across restarts)");
}

export { sharedPostgresStorage };

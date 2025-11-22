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

export const sharedPostgresStorage = new PostgresStore({
  connectionString: getDatabaseUrl(),
});

import { MongoClient, Db, MongoClientOptions } from "mongodb";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://nikitavisitskiy_db_user:i4zCkdT80v9iUEgw@cluster0.loefhqo.mongodb.net/?appName=Cluster0";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const options: MongoClientOptions = {
      maxPoolSize: 10,
    };

    const client = new MongoClient(MONGO_URI, options);
    await client.connect();

    const db = client.db("tempo_nova");

    // Verify connection
    await db.admin().ping();
    console.log("✅ Connected to MongoDB");

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log("✅ MongoDB connection closed");
  }
}

export function getDatabase(): Db | null {
  return cachedDb;
}

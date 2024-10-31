import sqlite3 from "sqlite3";
import { Profile as Metadata } from "./types";

// SQLite database initialization
const db = new sqlite3.Database(".cache/cache.db");

export class ProfileCache {
  static async init() {
    const cache = new ProfileCache("cache_v2");
    await cache.createTableIfNotExists();
    return cache;
  }

  private readonly key: string;

  private constructor(key: string) {
    this.key = key;
  }

  private async createTableIfNotExists() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.key} (
        id TEXT PRIMARY KEY,
        cidV0 TEXT,
        data TEXT
      )
    `;
    await new Promise<void>((resolve, reject) => {
      db.run(query, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public read(id: string): Promise<{ cidV0: string; data: Metadata } | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT data, cidV0 FROM ${this.key} WHERE id = ?`;
      db.get(query, [id], (err, row: any) => {
        if (err) {
          console.error("Error executing query:", err);
          reject(err);
        } else {
          resolve(
            row ? { cidV0: row.cidV0, data: JSON.parse(row.data) } : null
          );
        }
      });
    });
  }

  public async add(id: string, cidV0: string, metadata: Metadata) {
    const query = `INSERT INTO ${this.key} (id, cidV0, data) VALUES (?, ?, ?)`;
    const data = JSON.stringify(metadata);

    return new Promise<void>((resolve, reject) => {
      db.run(query, [id, cidV0, data], (err) => {
        if (err) {
          console.error("Error executing query:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

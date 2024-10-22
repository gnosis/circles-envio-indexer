import sqlite3 from "sqlite3";
import { Profile as Metadata } from "./types";

// SQLite database initialization
const db = new sqlite3.Database(".cache/cache.db");

export class ProfileCache {
  static async init() {
    const cache = new ProfileCache("cache");
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

  public read(id: string): Promise<Metadata | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT data FROM ${this.key} WHERE id = ?`;
      db.get(query, [id], (err, row: any) => {
        if (err) {
          console.error("Error executing query:", err);
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.data) : null);
        }
      });
    });
  }

  public async add(id: string, metadata: Metadata) {
    const query = `INSERT INTO ${this.key} (id, data) VALUES (?, ?)`;
    const data = JSON.stringify(metadata);

    return new Promise<void>((resolve, reject) => {
      db.run(query, [id, data], (err) => {
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

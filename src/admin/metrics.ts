import Database from 'better-sqlite3';
import { resolve } from 'path';

export interface CommandLogEntry {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  guildId: string;
  guildName: string;
  commandName: string;
  success: boolean;
  durationMs: number;
  errorMessage: string | null;
}

export interface ErrorLogEntry {
  id: number;
  timestamp: string;
  commandName: string;
  userId: string;
  userName: string;
  guildId: string;
  errorMessage: string;
  stackTrace: string | null;
}

export interface DashboardStats {
  totalCommands: number;
  commandsToday: number;
  commandsThisWeek: number;
  totalErrors: number;
  errorsToday: number;
  uptime: string;
  topCommands: Array<{ commandName: string; count: number }>;
  topUsers: Array<{ userName: string; count: number }>;
  recentCommands: CommandLogEntry[];
  recentErrors: ErrorLogEntry[];
}

let db: Database.Database | null = null;

export function getMetricsDb(): Database.Database {
  if (!db) {
    const dbPath = resolve(process.cwd(), 'data', 'metrics.db');
    const fs = require('fs');
    const dataDir = resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      guild_id TEXT NOT NULL DEFAULT '',
      guild_name TEXT NOT NULL DEFAULT '',
      command_name TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      command_name TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL DEFAULT '',
      user_name TEXT NOT NULL DEFAULT '',
      guild_id TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL,
      stack_trace TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_command_logs_timestamp ON command_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_command_logs_command ON command_logs(command_name);
    CREATE INDEX IF NOT EXISTS idx_command_logs_user ON command_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
  `);
}

export function logCommand(entry: Omit<CommandLogEntry, 'id' | 'timestamp'>): void {
  const database = getMetricsDb();
  const stmt = database.prepare(`
    INSERT INTO command_logs (user_id, user_name, guild_id, guild_name, command_name, success, duration_ms, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.userId,
    entry.userName,
    entry.guildId,
    entry.guildName,
    entry.commandName,
    entry.success ? 1 : 0,
    entry.durationMs,
    entry.errorMessage
  );
}

export function logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): void {
  const database = getMetricsDb();
  const stmt = database.prepare(`
    INSERT INTO error_logs (command_name, user_id, user_name, guild_id, error_message, stack_trace)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.commandName,
    entry.userId,
    entry.userName,
    entry.guildId,
    entry.errorMessage,
    entry.stackTrace
  );
}

export function getDashboardStats(): DashboardStats {
  const database = getMetricsDb();

  const totalCommands = database.prepare('SELECT COUNT(*) as count FROM command_logs').get() as { count: number };
  const commandsToday = database.prepare("SELECT COUNT(*) as count FROM command_logs WHERE date(timestamp) = date('now')").get() as { count: number };
  const commandsThisWeek = database.prepare("SELECT COUNT(*) as count FROM command_logs WHERE timestamp >= datetime('now', '-7 days')").get() as { count: number };
  const totalErrors = database.prepare('SELECT COUNT(*) as count FROM error_logs').get() as { count: number };
  const errorsToday = database.prepare("SELECT COUNT(*) as count FROM error_logs WHERE date(timestamp) = date('now')").get() as { count: number };

  const topCommands = database.prepare(`
    SELECT command_name, COUNT(*) as count FROM command_logs
    GROUP BY command_name ORDER BY count DESC LIMIT 10
  `).all() as Array<{ command_name: string; count: number }>;

  const topUsers = database.prepare(`
    SELECT user_name, COUNT(*) as count FROM command_logs
    WHERE user_name != '' GROUP BY user_id ORDER BY count DESC LIMIT 10
  `).all() as Array<{ user_name: string; count: number }>;

  const recentCommands = database.prepare(`
    SELECT * FROM command_logs ORDER BY timestamp DESC LIMIT 20
  `).all() as CommandLogEntry[];

  const recentErrors = database.prepare(`
    SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 20
  `).all() as ErrorLogEntry[];

  return {
    totalCommands: totalCommands.count,
    commandsToday: commandsToday.count,
    commandsThisWeek: commandsThisWeek.count,
    totalErrors: totalErrors.count,
    errorsToday: errorsToday.count,
    uptime: '',
    topCommands: topCommands.map(c => ({ commandName: c.command_name, count: c.count })),
    topUsers: topUsers.map(u => ({ userName: u.user_name, count: u.count })),
    recentCommands,
    recentErrors,
  };
}

export function getCommandLogs(limit = 100, offset = 0): CommandLogEntry[] {
  const database = getMetricsDb();
  return database.prepare(`
    SELECT * FROM command_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as CommandLogEntry[];
}

export function getErrorLogs(limit = 100, offset = 0): ErrorLogEntry[] {
  const database = getMetricsDb();
  return database.prepare(`
    SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as ErrorLogEntry[];
}

export function getCommandStatsByDay(days = 7): Array<{ date: string; count: number; errors: number }> {
  const database = getMetricsDb();
  return database.prepare(`
    SELECT
      date(timestamp) as date,
      COUNT(*) as count,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
    FROM command_logs
    WHERE timestamp >= datetime('now', ? || ' days')
    GROUP BY date(timestamp)
    ORDER BY date DESC
  `).all(`-${days}`) as Array<{ date: string; count: number; errors: number }>;
}

import { appendFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import redisClient, { redis } from './redis';

/**
 * Niveaux de log disponibles
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

/**
 * Structure d'un log stocké dans Redis
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
}

/**
 * Configuration du logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  enableRedis: boolean;
  redisKey: string;
  redisMaxEntries: number;
  dateFormat: Intl.DateTimeFormatOptions;
}

/**
 * Configuration par défaut du logger
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  logDir: path.join(process.cwd(), 'logs'),
  enableRedis: true,
  redisKey: 'app:logs',
  redisMaxEntries: 1000,
  dateFormat: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  },
};

/**
 * Classe principale du logger
 */
export class Logger {
  private readonly config: LoggerConfig;
  private static instance: Logger;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  /**
   * Obtenir l'instance unique du logger (pattern Singleton)
   */
  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Initialisation du logger
   */
  private init(): void {
    // Création synchrone du répertoire de logs si nécessaire
    if (this.config.enableFile && !existsSync(this.config.logDir)) {
      try {
        mkdirSync(this.config.logDir, { recursive: true });
      } catch (error) {
        console.error('Erreur lors de la création du répertoire de logs:', error);
        this.config.enableFile = false;
      }
    }
  }

  /**
   * Formater un message de log
   */
  private formatLogMessage(level: LogLevel, message: string, context: Record<string, unknown> = {}): string {
    const levelStr = LogLevel[level].padEnd(8);
    const timestamp = new Date().toLocaleString('fr-FR', this.config.dateFormat);
    
    let formattedMessage = `${timestamp} ${levelStr} ${message}`;
    
    if (Object.keys(context).length > 0) {
      const contextStr = JSON.stringify(context, (key, value) => {
        // Traiter spécialement les objets Error
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      }, 2);
      
      formattedMessage += `Contexte: ${contextStr}`;
    }
    
    return formattedMessage;
  }

  /**
   * Écrire un message dans la console
   */
  private logToConsole(level: LogLevel, formattedMessage: string): void {
    if (!this.config.enableConsole || level < this.config.minLevel) return;
    
    // Utiliser différentes méthodes console selon le niveau
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  /**
   * Écrire un message dans un fichier
   */
  private async logToFile(level: LogLevel, formattedMessage: string): Promise<void> {
    if (!this.config.enableFile || level < this.config.minLevel) return;
    
    try {
      const date = new Date();
      const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
      const filePath = path.join(this.config.logDir, fileName);
      
      await appendFile(filePath, formattedMessage + '', { encoding: 'utf8' });
    } catch (error) {
      console.error('Erreur lors de l\'écriture du log dans le fichier:', error);
    }
  }

  /**
   * Stocker un message dans Redis
   */
  private async logToRedis(level: LogLevel, message: string, context: Record<string, unknown> = {}): Promise<void> {
    if (!this.config.enableRedis || level < this.config.minLevel) return;
    
    try {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel[level],
        message,
        context,
      };
      
      // Utiliser la structure de liste Redis pour les logs
      await redisClient.lpush(this.config.redisKey, logEntry);
      
      // Vérifier si on doit limiter la taille de la liste
      if (this.config.redisMaxEntries > 0) {
        // Supprimer les éléments excédentaires
        const currentLength = await redis.llen(this.config.redisKey);
        if (currentLength > this.config.redisMaxEntries) {
          await redis.ltrim(this.config.redisKey, 0, this.config.redisMaxEntries - 1);
        }
      }
    } catch (error) {
      console.error('Erreur lors du stockage du log dans Redis:', error);
    }
  }

  /**
   * Méthode principale pour journaliser un message
   */
  public async log(level: LogLevel, message: string, context: Record<string, unknown> = {}): Promise<void> {
    if (level < this.config.minLevel) return;
    
    const formattedMessage = this.formatLogMessage(level, message, context);
    
    // Log dans la console (synchrone)
    this.logToConsole(level, formattedMessage);
    
    // Log dans le fichier et Redis (asynchrone)
    await Promise.allSettled([
      this.logToFile(level, formattedMessage),
      this.logToRedis(level, message, context),
    ]);
  }

  /**
   * Enregistrer un message de niveau DEBUG
   */
  public async debug(message: string, context: Record<string, unknown> = {}): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Enregistrer un message de niveau INFO
   */
  public async info(message: string, context: Record<string, unknown> = {}): Promise<void> {
    await this.log(LogLevel.INFO, message, context);
  }

  /**
   * Enregistrer un message de niveau WARN
   */
  public async warn(message: string, context: Record<string, unknown> = {}): Promise<void> {
    await this.log(LogLevel.WARN, message, context);
  }

  /**
   * Enregistrer un message de niveau ERROR
   */
  public async error(message: string, context: Record<string, unknown> = {}): Promise<void> {
    await this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Enregistrer un message de niveau CRITICAL
   */
  public async critical(message: string, context: Record<string, unknown> = {}): Promise<void> {
    await this.log(LogLevel.CRITICAL, message, context);
  }

  /**
   * Récupérer les derniers logs stockés dans Redis
   */
  public async getRecentLogs(count = 100): Promise<LogEntry[]> {
    if (!this.config.enableRedis) return [];
    
    try {
      const logs = await redis.lrange(this.config.redisKey, 0, count - 1);
      return logs.map((log: string) => JSON.parse(log) as LogEntry);
    } catch (error) {
      console.error('Erreur lors de la récupération des logs depuis Redis:', error);
      return [];
    }
  }

  /**
   * Effacer les logs stockés dans Redis
   */
  public async clearRedisLogs(): Promise<void> {
    if (!this.config.enableRedis) return;
    
    try {
      await redisClient.del(this.config.redisKey);
    } catch (error) {
      console.error('Erreur lors de la suppression des logs Redis:', error);
    }
  }
}

// Exporter l'instance par défaut du logger
const logger = Logger.getInstance();
export default logger;
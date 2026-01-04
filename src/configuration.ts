/**
 * Global configuration for happy CLI
 * 
 * Centralizes all configuration including environment variables and paths
 * Environment files should be loaded using Node's --env-file flag
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import packageJson from '../package.json'

class Configuration {
  public readonly serverUrl: string
  public readonly webappUrl: string
  public readonly isDaemonProcess: boolean

  // Directories and paths (from persistence)
  public readonly happyHomeDir: string
  public readonly logsDir: string
  public readonly settingsFile: string
  public readonly privateKeyFile: string
  public readonly daemonStateFile: string
  public readonly daemonLockFile: string
  public readonly currentCliVersion: string

  public readonly isExperimentalEnabled: boolean
  public readonly disableCaffeinate: boolean

  // API Key for service-level authentication (X-API-Key header)
  public readonly apiKey: string | null

  constructor() {
    // Check if we're running as daemon based on process args
    const args = process.argv.slice(2)
    this.isDaemonProcess = args.length >= 2 && args[0] === 'daemon' && (args[1] === 'start-sync')

    // Directory configuration - Priority: HAPPY_HOME_DIR env > default home dir
    if (process.env.HAPPY_HOME_DIR) {
      // Expand ~ to home directory if present
      const expandedPath = process.env.HAPPY_HOME_DIR.replace(/^~/, homedir())
      this.happyHomeDir = expandedPath
    } else {
      this.happyHomeDir = join(homedir(), '.happy')
    }

    this.logsDir = join(this.happyHomeDir, 'logs')
    this.settingsFile = join(this.happyHomeDir, 'settings.json')
    this.privateKeyFile = join(this.happyHomeDir, 'access.key')
    this.daemonStateFile = join(this.happyHomeDir, 'daemon.state.json')
    this.daemonLockFile = join(this.happyHomeDir, 'daemon.state.json.lock')

    // Ensure directories exist before reading settings
    if (!existsSync(this.happyHomeDir)) {
      mkdirSync(this.happyHomeDir, { recursive: true })
    }
    // Ensure directories exist
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }

    // Read settings from config file (if exists)
    let configFileSettings: { serverUrl?: string; webappUrl?: string; apiKey?: string } = {}
    try {
      if (existsSync(this.settingsFile)) {
        const content = readFileSync(this.settingsFile, 'utf8')
        const parsed = JSON.parse(content)
        if (parsed.serverUrl && typeof parsed.serverUrl === 'string') {
          configFileSettings.serverUrl = parsed.serverUrl
        }
        if (parsed.webappUrl && typeof parsed.webappUrl === 'string') {
          configFileSettings.webappUrl = parsed.webappUrl
        }
        if (parsed.apiKey && typeof parsed.apiKey === 'string') {
          configFileSettings.apiKey = parsed.apiKey
        }
      }
    } catch {
      // If config file is corrupted or can't be read, ignore it
      // Environment variables and defaults will be used instead
    }

    // Server configuration - priority: environment > config file > default
    this.serverUrl = process.env.HAPPY_SERVER_URL || configFileSettings.serverUrl || 'https://api.cluster-fluster.com'
    this.webappUrl = process.env.HAPPY_WEBAPP_URL || configFileSettings.webappUrl || 'https://app.happy.engineering'

    // API Key - priority: environment > config file > null (backward compatible)
    this.apiKey = process.env.HAPPY_API_KEY || configFileSettings.apiKey || null

    this.isExperimentalEnabled = ['true', '1', 'yes'].includes(process.env.HAPPY_EXPERIMENTAL?.toLowerCase() || '');
    this.disableCaffeinate = ['true', '1', 'yes'].includes(process.env.HAPPY_DISABLE_CAFFEINATE?.toLowerCase() || '');

    this.currentCliVersion = packageJson.version
  }
}

export const configuration: Configuration = new Configuration()

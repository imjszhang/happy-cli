import chalk from 'chalk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { configuration } from '@/configuration';

/**
 * Handle config subcommands
 */
export async function handleConfigCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    showConfigHelp();
    return;
  }

  switch (subcommand) {
    case 'set-api-key':
      await handleSetApiKey(args.slice(1));
      break;
    case 'show':
      await handleShowConfig();
      break;
    default:
      console.error(chalk.red(`Unknown config subcommand: ${subcommand}`));
      showConfigHelp();
      process.exit(1);
  }
}

function showConfigHelp(): void {
  console.log(`
${chalk.bold('happy config')} - Configuration management

${chalk.bold('Usage:')}
  happy config set-api-key <key>    Set the API Key for service authentication
  happy config show                 Show current configuration
  happy config help                 Show this help message

${chalk.bold('Environment Variables:')}
  HAPPY_API_KEY          API Key (overrides config file)
  HAPPY_SERVER_URL       Server URL (overrides config file)
  HAPPY_WEBAPP_URL       Web app URL (overrides config file)

${chalk.bold('Examples:')}
  happy config set-api-key sk-xxxx-xxxx-xxxx
  happy config show
`);
}

/**
 * Read current settings.json content
 */
async function readSettingsJson(): Promise<Record<string, unknown>> {
  try {
    if (existsSync(configuration.settingsFile)) {
      const content = await readFile(configuration.settingsFile, 'utf8');
      return JSON.parse(content);
    }
  } catch {
    // If corrupted, start fresh
  }
  return {};
}

/**
 * Write settings.json content
 */
async function writeSettingsJson(settings: Record<string, unknown>): Promise<void> {
  if (!existsSync(configuration.happyHomeDir)) {
    await mkdir(configuration.happyHomeDir, { recursive: true });
  }
  await writeFile(configuration.settingsFile, JSON.stringify(settings, null, 2));
}

/**
 * Set API Key in settings.json
 */
async function handleSetApiKey(args: string[]): Promise<void> {
  const apiKey = args[0];

  if (!apiKey) {
    console.error(chalk.red('Error: API Key is required'));
    console.log(chalk.gray('Usage: happy config set-api-key <key>'));
    process.exit(1);
  }

  // Read current settings and update apiKey
  const settings = await readSettingsJson();
  settings.apiKey = apiKey;
  await writeSettingsJson(settings);

  console.log(chalk.green('✓ API Key saved successfully'));
  console.log(chalk.gray(`  Config file: ${configuration.settingsFile}`));
  console.log(chalk.gray('  Note: Environment variable HAPPY_API_KEY takes priority if set'));
}

/**
 * Show current configuration
 */
async function handleShowConfig(): Promise<void> {
  console.log(chalk.bold('\nCurrent Configuration\n'));

  // Server URL
  console.log(chalk.cyan('Server URL:'));
  console.log(`  ${configuration.serverUrl}`);
  if (process.env.HAPPY_SERVER_URL) {
    console.log(chalk.gray('  (from environment variable)'));
  }

  // Web App URL
  console.log(chalk.cyan('\nWeb App URL:'));
  console.log(`  ${configuration.webappUrl}`);
  if (process.env.HAPPY_WEBAPP_URL) {
    console.log(chalk.gray('  (from environment variable)'));
  }

  // API Key
  console.log(chalk.cyan('\nAPI Key:'));
  if (configuration.apiKey) {
    // Mask API key for security (show first 8 and last 4 chars)
    const masked = maskApiKey(configuration.apiKey);
    console.log(`  ${masked}`);
    if (process.env.HAPPY_API_KEY) {
      console.log(chalk.gray('  (from environment variable)'));
    } else {
      console.log(chalk.gray('  (from config file)'));
    }
  } else {
    console.log(chalk.yellow('  Not configured'));
    console.log(chalk.gray('  Use "happy config set-api-key <key>" or set HAPPY_API_KEY env var'));
  }

  // Data directory
  console.log(chalk.cyan('\nData Directory:'));
  console.log(`  ${configuration.happyHomeDir}`);

  // Config file location
  console.log(chalk.cyan('\nConfig File:'));
  console.log(`  ${configuration.settingsFile}`);
  if (existsSync(configuration.settingsFile)) {
    console.log(chalk.gray('  (exists)'));
  } else {
    console.log(chalk.gray('  (not created yet)'));
  }

  // CLI Version
  console.log(chalk.cyan('\nCLI Version:'));
  console.log(`  ${configuration.currentCliVersion}`);
}

/**
 * Mask API key for display (show first 8 and last 4 chars)
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '*'.repeat(apiKey.length);
  }
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = '*'.repeat(Math.min(apiKey.length - 12, 20));
  return `${prefix}${masked}${suffix}`;
}

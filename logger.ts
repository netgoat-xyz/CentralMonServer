import chalk from 'chalk';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success' | 'stats';

const levels: Record<LogLevel, { color: typeof chalk; emoji: string }> = {
  info: { color: chalk.cyan, emoji: 'ℹ️ ' },
  warn: { color: chalk.yellow, emoji: '⚠️ ' },
  error: { color: chalk.red, emoji: '❌ ' },
  debug: { color: chalk.magenta, emoji: '🐛 ' },
  success: { color: chalk.green, emoji: '✅' },
  stats: { color: chalk.blue, emoji: '📢' }
};

const log = (level: LogLevel, ...msg: unknown[]) => {
  const { color, emoji } = levels[level];
  const timestamp = chalk.gray(new Date().toISOString());
  console.log(`${emoji} ${timestamp} ${color.bold(level.toUpperCase())} ›`, ...msg);
};

export default log
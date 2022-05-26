const chalk = require('chalk')
const format = require('util').format

/**
 * 前缀
 */

const prefix = '   rje-cli'
const sep = chalk.gray('·')

/**
 * 将消息打印到控制台.
 *
 * @param {String} message
 */

exports.log = function (...args) {
  const msg = format.apply(format, args)
  console.log(chalk.white(prefix), sep, msg)
}

/**
 * 将错误“消息”打印到控制台并退出进程
 *
 * @param {String} message
 */

exports.fatal = function (...args) {
  if (args[0] instanceof Error) args[0] = args[0].message.trim()
  const msg = format.apply(format, args)
  console.error(chalk.red(prefix), sep, msg)
  process.exit(1)
}

/**
 * 将成功“消息”打印到控制台并退出进程
 *
 * @param {String} message
 */

exports.success = function (...args) {
  const msg = format.apply(format, args)
  console.log(chalk.white(prefix), sep, msg)
  process.exit(1)
}

const prod = process.env.NODE_ENV === 'production'
const ProgressBar = require('progress')
const chalk = require('chalk')

/**
 * Simple progress bar
 */
class Progress extends ProgressBar {
  constructor (string, total) {
    super(`${string.padEnd(24, ' ')}: ${chalk.green('[')}:bar${chalk.green(']')} :current/:total (:elapseds) :etas remaining`, {
      incomplete: chalk.red('-'),
      width: 20,
      total: total
    })
  }
}

/**
 * Use dummy object in prod because pm2 won't render
 * the progress bar properly.
 */
module.exports = prod
  ? class Empty {
    interrupt () {}
    tick () {}
  }
  : Progress

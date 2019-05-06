const prod = process.env.NODE_ENV === 'production'
const ProgressBar = require('progress')
const colors = require('colors/safe')

/**
 * Simple progress bar
 */
class Progress extends ProgressBar {
  constructor (string, total) {
    super(`:check ${string}: ${colors.green('[')}:bar${colors.green(']')} :current/:total :etas remaining ${colors.cyan(':type')}`, {
      incomplete: colors.red('-'),
      width: 20,
      total
    })
  }
}

/**
 * Use dummy object in prod because pm2 won't render
 * the progress bar properly.
 */
module.exports = prod ? {
  interrupt () {}, tick () {}
} : Progress

import ProgressBar from 'progress';
import colors from 'chalk';

const prod = process.env.NODE_ENV === 'production';

/**
 * Simple progress bar
 */
class Progress extends ProgressBar {
  constructor(string, total) {
    super(
      `${string.padEnd(24, ' ')}: ${colors.green('[')}:bar${colors.green(
        ']'
      )} :current/:total (:elapseds) :etas remaining`,
      {
        incomplete: colors.red('-'),
        width: 20,
        total,
      }
    );
  }
}

/**
 * Use dummy object in prod because pm2 won't render
 * the progress bar properly.
 */
export default prod
  ? class Empty {
      interrupt() {}
      tick() {}
    }
  : Progress;

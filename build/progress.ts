import ProgressBar from 'progress';
import colors from 'chalk';

const prod = process.env.NODE_ENV === 'production';

type ProgressInterface = new (
  string: string,
  total: number
) => {
  interrupt(message?: string): void;
  tick(delta?: number): void;
};

/**
 * Simple progress bar
 */
class ProgressImpl extends ProgressBar {
  constructor(string: string, total: number) {
    super(
      `${string.padEnd(24, ' ')}: ${colors.green('[')}:bar${colors.green(
        ']'
      )} :current/:total (:elapseds) :etas remaining`,
      // it's really a ProgressBarOptions, but the types won't resolve that way
      {
        incomplete: colors.red('-'),
        width: 20,
        total,
      } as unknown as number
    );
  }
}

/**
 * Dummy progress bar for production
 */
class EmptyProgress {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  interrupt(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  tick(): void {}
}

/**
 * Use dummy object in prod because pm2 won't render
 * the progress bar properly.
 */
const ProgressClass: ProgressInterface = (prod ? EmptyProgress : ProgressImpl) as ProgressInterface;

export default ProgressClass;

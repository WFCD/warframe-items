/**
 * Simple sleep function that returns a promise that resolves after a given number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the given number of milliseconds
 */
export default (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

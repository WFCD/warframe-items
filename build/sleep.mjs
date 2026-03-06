/**
 * Simple sleep function that returns a promise that resolves after a given number of milliseconds
 * @param  {number} ms Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the given number of milliseconds
 */
export default (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

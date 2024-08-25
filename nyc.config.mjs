export default {
  branches: 100,
  'check-coverage': true,
  exclude: ['test/*', 'build/*', 'config/*', 'data/*', 'docker/*', 'index.d.ts'],
  functions: 100,
  lines: 100,
  reporter: ['lcov', 'text'],
  'skip-full': true,
  statements: 100,
};

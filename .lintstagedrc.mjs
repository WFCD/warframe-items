export default {
  '*.{js,mjs,cjs,ts}': [
    'eslint --cache --fix',
    // lint-staged appends staged paths by default; mocha would treat them as specs
    () => 'npm test',
  ],
  'package.json': [
    'eslint --cache --fix',
    () => 'npm dedupe',
    'npx sort-package-json',
  ],
  '*.{json,yml,yaml}': 'eslint --cache --fix',
};

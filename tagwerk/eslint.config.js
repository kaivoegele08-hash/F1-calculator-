const expoConfig = require('eslint-config-expo/flat');
module.exports = [
  ...expoConfig,
  { ignores: ['node_modules/*', '.expo/*', 'dist/*', 'coverage/*', 'assets/src/*'] },
  { files: ['jest.setup.js'], languageOptions: { globals: { jest: 'readonly' } } },
];

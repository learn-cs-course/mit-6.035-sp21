require('@reskript/config-lint/patch');

module.exports = {
    extends: require.resolve('@reskript/config-lint/config/eslint'),
    rules: {
        'no-underscore-dangle': 'off',
        'no-undef-init': 'off',
        'complexity': 'off',
        'max-depth': 'off',
        'max-statements': 'off',
        'max-lines': 'off',
        'no-constant-condition': 'off',
    },
};

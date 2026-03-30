module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs', // Это важно, так как у тебя Node.js/Express
      globals: {
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn', // Подсветит желтым неиспользуемые переменные
      'no-undef': 'error', // Подсветит красным несуществующие переменные
      'no-console': 'off', // Не будет ругаться на console.log

      eqeqeq: 'error', // Запрещает == вместо === (защита от странных приведений типов)
      curly: 'error', // Обязательные {} для всех if/for (защита от ошибок логики)
      'no-duplicate-imports': 'error', // Запрещает дублирование импортов
      'no-self-compare': 'error', // Ошибка, если x === x (бессмысленное сравнение)
      'no-template-curly-in-string': 'warn', // Предупредит, если ты забыл ` ` при использовании ${}
      'no-unreachable': 'error', // Подсветит код, который никогда не выполнится (после return)
    },
  },
];

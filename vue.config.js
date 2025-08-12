const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    admin: {
      entry: 'src/main-admin.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Administrace kvízu',
    },
    display: {
      entry: 'src/main-display.js',
      template: 'public/display.html',
      filename: 'display.html',
      title: 'Zobrazení výsledků',
    },
    history: {
      entry: 'src/main-history.js',
      template: 'public/quiz-history.html',
      filename: 'quiz-history.html',
      title: 'Historie kvízů',
    },
      reservations: {
      entry: 'src/main-reservations.js',
      template: 'public/reservations.html',
      filename: 'reservations.html',
      title: 'Rezervace na kvíz',
    },
  },
});
require('dotenv').config(); // Подключение dotenv
const express = require('express'); // Подключение библиотеки Express для создания веб-сервера
const bodyParser = require('body-parser'); // Подключение библиотеки body-parser для обработки данных форм POST
const session = require('express-session'); // Подключение библиотеки express-session для управления сессиями на стороне сервера
const cookieParser = require('cookie-parser'); // Подключение библиотеки cookie-parser для работы сервера с cookies
const hbs = require('hbs'); // Подключение шаблонизатора Handlebars для генерации HTML-страниц
const { pool, initDb } = require('./db'); // Подключение модуля для работы с базой данных PostgreSQL
const pgSession = require('connect-pg-simple')(session); // Подключение connect-pg-simple

// Создание экземпляра приложения Express
const app = express();

// Функция checkDbConnection проверяет подключение к базе данных
async function checkDbConnection() {
  try {
    await pool.query('SELECT NOW()'); // Выполнение запроса к базе данных для проверки подключения
    console.log('Подключено к базе данных успешно.');
  } catch (err) {
    console.error('Ошибка подключения к базе данных', err);
    process.exit(1);
  }
}

(async () => {
  await checkDbConnection(); // Проверка подключения к базе данных
  await initDb(); // Инициализация базы данных, если она еще не создана

  // Установка шаблонизатора Handlebars в качестве стандартного для приложения и подключение layout
  app.set('view engine', 'hbs');
  hbs.registerPartials(__dirname + '/views/partials');

  // Обслуживание статических файлов из директории public
  app.use(express.static('public'));

  // Использование middleware bodyParser для обработки данных формы POST
  app.use(bodyParser.urlencoded({ extended: false }));

  // Использование middleware cookieParser для работы с cookies
  app.use(cookieParser());

  // Использование middleware express-session для управления сессиями
  app.use(
    session({
      store: new pgSession({
        pool: pool, // Используем пул соединений PostgreSQL
        tableName: 'session', // Название таблицы для хранения сессий
      }),
      secret: process.env.SESSION_SECRET, // Параметры секретного ключа сессии
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // Установка времени жизни сессии (1 день)
        secure: false, // Использовать true, если используется HTTPS
      },
    }),
  );

  // Middleware для установки глобальных переменных
  app.use((req, res, next) => {
    res.locals.user = req.session.user; // Сохраняем пользователя из сессии в локальной переменной
    next();
  });

  // Импорт маршрутов
  const authRoutes = require('./routes/auth');
  const profileRoutes = require('./routes/profile');
  const quizRoutes = require('./routes/quiz');
  const resultRoutes = require('./routes/result');
  const adminRoutes = require('./routes/admin');
  const editQuizRoutes = require('./routes/edit-quiz');

  // Применение маршрутов
  app.use(authRoutes);
  app.use(profileRoutes);
  app.use(quizRoutes);
  app.use(resultRoutes);
  app.use(adminRoutes);
  app.use(editQuizRoutes);

  // Роут для главной страницы
  app.get('/', (req, res) => {
    if (req.session.user && req.session.user.isadmin) {
      return res.redirect('/admin'); // Перенаправление на страницу администратора
    }
    res.render('index'); // Рендеринг шаблона главной страницы
  });

  // Запуск сервера
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
})();

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const hbs = require('hbs');
const { pool, initDb } = require('./db');
const pgSession = require('connect-pg-simple')(session);

const app = express();

async function checkDbConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Подключено к базе данных успешно.');
  } catch (err) {
    console.error('Ошибка подключения к базе данных', err);
    process.exit(1);
  }
}

(async () => {
  await checkDbConnection();
  await initDb();

  app.set('view engine', 'hbs');
  hbs.registerPartials(__dirname + '/views/partials');

  hbs.registerHelper('inc', function (value, options) {
    return parseInt(value) + 1;
  });

  app.use(express.static('public'));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use(
    session({
      store: new pgSession({
        pool: pool,
        tableName: 'session',
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: false,
      },
    }),
  );

  app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
  });

  const authRoutes = require('./routes/auth');
  const profileRoutes = require('./routes/profile');
  const quizRoutes = require('./routes/quiz');
  const resultRoutes = require('./routes/result');
  const adminRoutes = require('./routes/admin');
  const editQuizRoutes = require('./routes/edit-quiz');
  const resultsRoutes = require('./routes/results'); // Новый маршрут

  app.use(authRoutes);
  app.use(profileRoutes);
  app.use(quizRoutes);
  app.use(resultRoutes);
  app.use(adminRoutes);
  app.use(editQuizRoutes);
  app.use(resultsRoutes); // Подключение нового маршрута

  app.get('/', (req, res) => {
    if (req.session.user && req.session.user.isadmin) {
      return res.redirect('/admin');
    }
    res.render('index');
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
})();

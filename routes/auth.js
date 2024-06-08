const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// Регистрация
router.get('/register', (req, res) => {
  res.render('register'); // Рендеринг шаблона регистрации
});

router.post('/register', async (req, res) => {
  const { login, email, password } = req.body; // Получение данных из тела запроса
  const hashedPassword = await bcrypt.hash(password, BCRYPT_COUNT); // Хэширование пароля перед сохранением в базу данных
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (result.rows.length > 0) {
      return res.send(
        'Пользователь с таким адресом электронной почты уже существует. Пожалуйста, используйте другой адрес электронной почты.',
      );
    }
    await pool.query(
      'INSERT INTO users (login, email, password, isAdmin) VALUES ($1, $2, $3, $4)',
      [login, email, hashedPassword, false],
    );
    const user = (
      await pool.query('SELECT * FROM users WHERE email = $1', [email])
    ).rows[0];
    req.session.user = user;
    res.cookie('user', user, { maxAge: 900000, httpOnly: true });
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

// Вход пользователя
router.get('/login', (req, res) => {
  res.render('login'); // Рендеринг шаблона входа
});

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE login = $1', [
      login,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        req.session.user = user; // Установка сессии пользователя
        res.cookie('user', user, { maxAge: 900000, httpOnly: true }); // Установка cookie с пользователем
        res.redirect('/'); // Перенаправление на главную страницу
      } else {
        res.render('login', { error: 'Неправильный логин или пароль' });
      }
    } else {
      res.render('login', {
        error: 'Пользователь не найден. Перенаправление на регистрацию...',
        redirect: true,
      });
    }
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

// Выход пользователя из системы
router.get('/logout', async (req, res) => {
  try {
    const sessionId = req.sessionID; // Получение идентификатора сессии
    await pool.query('DELETE FROM session WHERE sid = $1', [sessionId]); // Удаление сессии из базы данных
    req.session.destroy(); // Удаление сессии пользователя
    res.clearCookie('user'); // Удаление cookie с пользователем
    res.redirect('/'); // Перенаправление на главную страницу
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка при выходе пользователя');
  }
});

module.exports = router;

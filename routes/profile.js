// Подключение библиотеки Express и создание экземпляра Router
const express = require('express');
const router = express.Router();
// Подключение объекта pool для взаимодействия с базой данных
const { pool } = require('../db');
// Роутер для отображения профиля пользователя
router.get('/profile', (req, res) => {
  // Проверка наличия пользователя в сессии
  if (!req.session.user) {
    // Если пользователя нет, перенаправляем на страницу входа
    return res.redirect('/login');
  }
  // Рендеринг шаблона профиля с данными пользователя
  res.render('profile', { user: req.session.user });
});
// Роутер для обновления данных пользователя
router.post('/update', async (req, res) => {
  // Получение новых данных пользователя из тела запроса
  const { login, email } = req.body;
  // Получаем идентификатор пользователя из сессии
  const userId = req.session.user.id;
  // Обновление данных пользователя в базе данных
  try {
    await pool.query('UPDATE users SET login = $1, email = $2 WHERE id = $3', [
      login,
      email,
      userId,
    ]);
    // Обновление данных пользователя в сессии
    req.session.user.login = login;
    req.session.user.email = email;
    // Перенаправление на страницу профиля
    res.redirect('/profile');
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});
// Роутер для удаления учетной записи пользователя
router.post('/delete', async (req, res) => {
  // Получаем идентификатор пользователя из сессии
  const userId = req.session.user.id;
  // Удаление результатов тестирования пользователя из базы данных
  try {
    // Удаляем сведения о результатах тестирования пользователя
    await pool.query('DELETE FROM quiz_results WHERE user_id = $1', [userId]);
    // Затем удаляем саму учетную запись пользователя
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    // Удаление сессии пользователя
    req.session.destroy();
    // Перенаправление на главную страницу
    res.redirect('/');
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

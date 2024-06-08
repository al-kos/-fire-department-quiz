// Подключение библиотеки Express и создание экземпляра Router
const express = require('express');
const router = express.Router();
// Подключение объекта pool для взаимодействия с базой данных
const { pool } = require('../db');

router.get('/admin', (req, res) => {
  // Проверка наличия пользователя с правами администратора в сессии
  if (!req.session.user || !req.session.user.isadmin) {
    // Если пользователь не администратор или сессия не установлена, перенаправляем на страницу входа
    return res.redirect('/login');
  }
  // Рендеринг шаблона администратора с именем пользователя
  res.render('admin', {
    username: req.session.user.login,
  });
});

module.exports = router;

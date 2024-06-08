// Подключение библиотеки Express и создание экземпляра Router
const express = require('express');
const router = express.Router();
// Подключение объекта pool для взаимодействия с базой данных
const { pool } = require('../db');
// Маршрут для отображения результатов викторины
router.get('/result', async (req, res) => {
  // Проверяем, есть ли пользователь в сессии
  if (!req.session.user) {
    // Если пользователя нет, перенаправляем на страницу входа
    return res.redirect('/login');
  }
  // Получаем идентификатор пользователя из сессии
  const userId = req.session.user.id;
  // Запрос к базе данных для получения результатов последней викторины пользователя
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_results WHERE user_id = $1 ORDER BY quiz_date DESC LIMIT 1',
      [userId],
    );
    // Если результаты есть, получаем первый элемент (последняя викторина)
    if (result.rows.length > 0) {
      const quizResult = result.rows[0];
      // Рендерим шаблон  с данными о викторине
      res.render('result', {
        totalQuestions: quizResult.total_questions,
        correctAnswers: quizResult.score,
      });
    } else {
      // Если результатов нет, рендерим шаблон  с информацией о том, что результатов нет
      res.render('result', {
        noResults: true,
      });
    }
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

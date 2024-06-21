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
  // Запрос к базе данных для получения всех результатов викторин пользователя
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_results WHERE user_id = $1 ORDER BY quiz_date DESC',
      [userId],
    );
    // Рендерим шаблон с данными о викторинах пользователя
    res.render('result', {
      results: result.rows.map((row) => ({
        totalQuestions: row.total_questions,
        correctAnswers: row.score,
        isSuccess: row.score === row.total_questions, // Определяем успешность по количеству правильных ответов
        quiz_date_formatted: new Date(row.quiz_date).toLocaleDateString(), // Формат даты
      })),
    });
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

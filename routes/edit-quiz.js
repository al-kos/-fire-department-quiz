// Подключение библиотеки Express и создание экземпляра Router
const express = require('express');
const router = express.Router();
// Подключение объекта pool для взаимодействия с базой данных
const { pool } = require('../db');
// Роутер для отображения страницы редактирования викторины
router.get('/edit-quiz', async (req, res) => {
  // Проверка наличия пользователя с правами администратора в сессии
  if (!req.session.user || !req.session.user.isadmin) {
    // Если пользователь не администратор или сессия не установлена, перенаправляем на страницу входа
    return res.redirect('/login');
  }
  // Запрос к базе данных для получения всех вопросов викторины
  try {
    const result = await pool.query('SELECT * FROM quiz_questions');
    // Получение вопросов
    const questions = result.rows;
    // Рендеринг шаблона редактирования викторины с вопросами
    res.render('edit-quiz', { questions });
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});
// Роутер для добавления нового вопроса в викторину
router.post('/edit-quiz/add', async (req, res) => {
  // Получение данных из тела запроса
  const { question, option1, option2, option3, answer } = req.body;
  // Вставка нового вопроса в базу данных
  try {
    await pool.query(
      'INSERT INTO quiz_questions (question, option1, option2, option3, answer) VALUES ($1, $2, $3, $4, $5)',
      [question, option1, option2, option3, answer],
    );
    // Перенаправление на страницу редактирования викторины
    res.redirect('/edit-quiz');
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});
// Роутер для обновления вопроса в викторине
router.post('/edit-quiz/update/:id', async (req, res) => {
  // Получение ID вопроса из параметров запроса
  const { id } = req.params;
  // Получение новых данных вопроса из тела запроса
  const { question, option1, option2, option3, answer } = req.body;
  // Обновление вопроса в базе данных
  try {
    await pool.query(
      'UPDATE quiz_questions SET question = $1, option1 = $2, option2 = $3, option3 = $4, answer = $5 WHERE id = $6',
      [question, option1, option2, option3, answer, id],
    );
    // Перенаправление на страницу редактирования викторины
    res.redirect('/edit-quiz');
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});
// Роутер для удаления вопроса из викторины
router.post('/edit-quiz/delete/:id', async (req, res) => {
  // Получение ID вопроса из параметров запроса
  const { id } = req.params;
  // Удаление вопроса из базы данных
  try {
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);
    // Перенаправление на страницу редактирования викторины
    res.redirect('/edit-quiz');
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

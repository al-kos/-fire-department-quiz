// Подключение библиотеки Express и создание экземпляра Router
const express = require('express');
const router = express.Router();
// Подключение объекта pool для взаимодействия с базой данных
const { pool } = require('../db');
// Маршрут для отображения вопросов викторины
router.get('/quiz', async (req, res) => {
  // Проверка наличия пользователя в сессии
  if (!req.session.user) {
    // Если пользователя нет, перенаправляем на страницу входа
    return res.redirect('/login');
  }
  // Проверка наличия данных викторины в сессии
  if (!req.session.quiz) {
    // Если данных викторины нет, инициализируем их
    req.session.quiz = {
      currentQuestionIndex: 0,
      correctAnswers: 0,
    };
  }
  // Запрос к базе данных для получения всех вопросов
  try {
    const result = await pool.query('SELECT * FROM quiz_questions');
    const questions = result.rows;
    const quiz = req.session.quiz; // Получение данных викторины из сессии
    const currentQuestion = questions[quiz.currentQuestionIndex]; // Получение текущего вопроса
    // Рендеринг вопроса и варианты ответов
    res.render('quiz', {
      question: currentQuestion.question,
      options: [
        currentQuestion.option1,
        currentQuestion.option2,
        currentQuestion.option3,
      ],
    });
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

// Маршрут для обработки ответов на вопросы викторины
router.post('/quiz', async (req, res) => {
  // Запрос к базе данных для получения всех вопросов
  try {
    const result = await pool.query('SELECT * FROM quiz_questions');
    const questions = result.rows;
    const quiz = req.session.quiz;
    const userAnswer = req.body.answer;
    const currentQuestion = questions[quiz.currentQuestionIndex];
    // Проверка ответа пользователя
    if (userAnswer === currentQuestion.answer) {
      quiz.correctAnswers++; // Увеличение количества правильных ответов
    }
    // Увеличение индекса текущего вопроса
    quiz.currentQuestionIndex++;
    // Проверка, закончилась ли викторина
    if (quiz.currentQuestionIndex >= questions.length) {
      // Сохранение результатов в базе данных
      const userId = req.session.user.id;
      await pool.query(
        'INSERT INTO quiz_results (user_id, score, total_questions) VALUES ($1, $2, $3)',
        [userId, quiz.correctAnswers, questions.length],
      );
      // Сохранение результатов в сессии для последующей передачи на страницу результатов
      req.session.quizResults = {
        totalQuestions: questions.length,
        correctAnswers: quiz.correctAnswers,
      };
      // Очистка данных викторины из сессии
      req.session.quiz = null;
      // Перенаправление на страницу результатов
      res.redirect('/result');
    } else {
      res.redirect('/quiz');
    }
  } catch (err) {
    // В случае ошибки выводим сообщение в консоль и отправляем сообщение об ошибке пользователю
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

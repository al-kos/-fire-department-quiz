const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Маршрут для отображения вопросов викторины
router.get('/quiz', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (!req.session.quiz) {
    req.session.quiz = {
      currentQuestionIndex: 0,
      correctAnswers: 0,
    };
  }

  try {
    const result = await pool.query('SELECT id, question FROM quiz_questions');
    const questions = result.rows;
    const quiz = req.session.quiz;
    const currentQuestion = questions[quiz.currentQuestionIndex];

    const answersResult = await pool.query(
      'SELECT id, answer FROM quiz_answers WHERE question_id = $1',
      [currentQuestion.id],
    );
    const answers = answersResult.rows;

    res.render('quiz', {
      question: currentQuestion.question,
      options: answers.map((answer) => answer.answer),
    });
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

// Маршрут для обработки ответов на вопросы викторины
router.post('/quiz', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, question FROM quiz_questions');
    const questions = result.rows;
    const quiz = req.session.quiz;
    const userAnswer = req.body.answer;
    const currentQuestion = questions[quiz.currentQuestionIndex];

    const answersResult = await pool.query(
      'SELECT id, answer, is_correct FROM quiz_answers WHERE question_id = $1',
      [currentQuestion.id],
    );
    const answers = answersResult.rows;
    const correctAnswer = answers.find((answer) => answer.is_correct).answer;

    if (userAnswer === correctAnswer) {
      quiz.correctAnswers++;
    }

    quiz.currentQuestionIndex++;

    if (quiz.currentQuestionIndex >= questions.length) {
      const userId = req.session.user.id;
      const totalQuestions = questions.length;
      const score = quiz.correctAnswers;
      const isSuccess = score / totalQuestions > 0.8;

      await pool.query(
        'INSERT INTO quiz_results (user_id, score, total_questions, isSuccess) VALUES ($1, $2, $3, $4)',
        [userId, score, totalQuestions, isSuccess],
      );

      req.session.quizResults = {
        totalQuestions,
        correctAnswers: score,
      };
      req.session.quiz = null;
      res.redirect('/result');
    } else {
      res.redirect('/quiz');
    }
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

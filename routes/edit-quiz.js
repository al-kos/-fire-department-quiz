const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/edit-quiz', async (req, res) => {
  if (!req.session.user || !req.session.user.isadmin) {
    return res.redirect('/login');
  }
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_questions_with_answers',
    );
    const questionsWithAnswers = result.rows;

    // Преобразование данных для удобного использования в шаблоне
    const questions = {};
    questionsWithAnswers.forEach((row) => {
      if (!questions[row.question_id]) {
        questions[row.question_id] = {
          id: row.question_id,
          question: row.question,
          answers: [],
        };
      }
      questions[row.question_id].answers.push({
        id: row.answer_id,
        answer: row.answer,
        is_correct: row.is_correct,
      });
    });

    res.render('edit-quiz', { questions: Object.values(questions) });
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

router.post('/edit-quiz/add', async (req, res) => {
  const { question, option1, option2, option3, answer } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO quiz_questions (question) VALUES ($1) RETURNING id',
      [question],
    );
    const questionId = result.rows[0].id;

    const answers = [
      { text: option1, is_correct: answer === 'option1' },
      { text: option2, is_correct: answer === 'option2' },
      { text: option3, is_correct: answer === 'option3' },
    ];

    for (const ans of answers) {
      await pool.query(
        'INSERT INTO quiz_answers (question_id, answer, is_correct) VALUES ($1, $2, $3)',
        [questionId, ans.text, ans.is_correct],
      );
    }

    res.redirect('/edit-quiz');
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

router.post('/edit-quiz/update/:id', async (req, res) => {
  const { id } = req.params;
  const { question, option1, option2, option3, answer } = req.body;
  try {
    await pool.query('UPDATE quiz_questions SET question = $1 WHERE id = $2', [
      question,
      id,
    ]);

    const answers = [
      { text: option1, is_correct: answer === 'option1' },
      { text: option2, is_correct: answer === 'option2' },
      { text: option3, is_correct: answer === 'option3' },
    ];

    const answerIds = await pool.query(
      'SELECT id FROM quiz_answers WHERE question_id = $1',
      [id],
    );

    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        'UPDATE quiz_answers SET answer = $1, is_correct = $2 WHERE id = $3',
        [answers[i].text, answers[i].is_correct, answerIds.rows[i].id],
      );
    }

    res.redirect('/edit-quiz');
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

router.post('/edit-quiz/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM quiz_answers WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);
    res.redirect('/edit-quiz');
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

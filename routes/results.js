const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const moment = require('moment');

// Маршрут для отображения страницы результатов
router.get('/results', async (req, res) => {
  if (!req.session.user || !req.session.user.isadmin) {
    return res.redirect('/login');
  }

  try {
    const resultsQuery = `
      SELECT users.login, quiz_results.quiz_date, quiz_results.issuccess
      FROM quiz_results
      JOIN users ON quiz_results.user_id = users.id
      ORDER BY quiz_results.quiz_date DESC;
    `;
    const results = await pool.query(resultsQuery);

    // Форматируем дату перед рендерингом
    const formattedResults = results.rows.map((row) => {
      return {
        ...row,
        quiz_date: moment(row.quiz_date).format('DD.MM.YYYY HH:mm'),
      };
    });
    res.render('results', { results: formattedResults });
  } catch (err) {
    console.error(err);
    res.send('Возникла ошибка');
  }
});

module.exports = router;

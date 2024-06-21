require('dotenv').config(); // Подключение dotenv
const { Pool } = require('pg'); // Подключение библиотеки pg для работы с базой данных PostgreSQL
const bcrypt = require('bcryptjs'); // Подключение библиотеки bcryptjs для хэширования паролей

// Создание нового экземпляра пула соединений с базой данных
const pool = new Pool({
  user: process.env.DB_USER, // Имя пользователя базы данных
  host: process.env.DB_HOST, // Хост, на котором расположена база данных
  database: process.env.DB_NAME, // Название базы данных
  password: process.env.DB_PASSWORD, // Пароль пользователя базы данных
  port: process.env.DB_PORT, // Порт, на котором слушает база данных
});

// Асинхронная функция инициализации базы данных
async function initDb() {
  const client = await pool.connect(); // Получение соединения с базой данных

  try {
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quiz_questions'
      );
    `;
    const { rows } = await client.query(checkTableQuery);
    const tableExists = rows[0].exists;

    if (!tableExists) {
      // Создание таблицы пользователей
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          login VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          isAdmin BOOLEAN DEFAULT FALSE
        );
      `);

      // Добавление администратора
      const hashedPassword = await bcrypt.hash('admin', 10);
      await client.query(
        `
        INSERT INTO users (login, email, password, isAdmin)
        VALUES ('admin', 'admin@admin.ru', $1, TRUE)
        ON CONFLICT (email) DO NOTHING;
      `,
        [hashedPassword],
      );

      // Создание таблицы вопросов
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_questions (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL
        );
      `);

      // Создание таблицы ответов
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_answers (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES quiz_questions(id),
          answer TEXT NOT NULL,
          is_correct BOOLEAN NOT NULL
        );
      `);

      // Добавление вопросов и ответов
      const questions = [
        {
          question:
            'Что следует делать при обнаружении поврежденного электрического кабеля на рабочем месте?',
          answers: [
            {
              text: 'Попытаться изолировать участок кабеля с помощью изоляционной ленты',
              isCorrect: false,
            },
            {
              text: 'Немедленно сообщить руководству и специалистам по безопасности',
              isCorrect: true,
            },
            {
              text: 'Подключить кабель к рабочему оборудованию, чтобы продолжить работу',
              isCorrect: false,
            },
          ],
        },
        {
          question:
            'Какие предметы обязательно должны быть на рабочем месте для выполнения работ с высоты?',
          answers: [
            {
              text: 'Ремни безопасности и средства индивидуальной защиты',
              isCorrect: true,
            },
            {
              text: 'Лестницы и таблички с предупреждениями',
              isCorrect: false,
            },
            { text: 'Перчатки и защитные очки', isCorrect: false },
          ],
        },
        {
          question:
            'Что делать, если рабочее место не оборудовано системой вентиляции?',
          answers: [
            {
              text: 'Использовать переносной вентилятор для улучшения воздушного обмена',
              isCorrect: true,
            },
            {
              text: 'Не предпринимать никаких действий и работать в обычном режиме',
              isCorrect: false,
            },
            {
              text: 'Вызвать электрика для установки вентиляционной системы',
              isCorrect: false,
            },
          ],
        },
        {
          question:
            'Какие меры безопасности следует соблюдать при работе с химическими веществами?',
          answers: [
            {
              text: 'Использовать только необходимое количество вещества и хранить их в отдельной комнате',
              isCorrect: false,
            },
            {
              text: 'Носить защитную одежду, перчатки и маску, соблюдать правила удаления отходов',
              isCorrect: true,
            },
            {
              text: 'Работать с химическими веществами вне зоны доступа других сотрудников',
              isCorrect: false,
            },
          ],
        },
        {
          question:
            'Какие первичные средства пожаротушения являются наиболее эффективными для тушения пожара на начальной стадии?',
          answers: [
            { text: 'Огнетушители', isCorrect: true },
            { text: 'Пожарные краны', isCorrect: false },
            {
              text: 'Автоматические установки пожаротушения',
              isCorrect: false,
            },
          ],
        },
      ];

      for (const q of questions) {
        const questionResult = await client.query(
          'INSERT INTO quiz_questions (question) VALUES ($1) RETURNING id',
          [q.question],
        );
        const questionId = questionResult.rows[0].id;

        for (const a of q.answers) {
          await client.query(
            'INSERT INTO quiz_answers (question_id, answer, is_correct) VALUES ($1, $2, $3)',
            [questionId, a.text, a.isCorrect],
          );
        }
      }

      // Создание таблицы результатов викторины
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_results (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          isSuccess BOOLEAN NOT NULL,
          quiz_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Проверка и создание таблицы сессий
    const checkSessionTableQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'session'
      );
    `;
    const sessionTableResult = await client.query(checkSessionTableQuery);
    const sessionTableExists = sessionTableResult.rows[0].exists;

    if (!sessionTableExists) {
      // Создание таблицы сессий
      await client.query(`
        CREATE TABLE IF NOT EXISTS session (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        ) WITH (OIDS=FALSE);

        ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);

        CREATE INDEX IDX_session_expire ON session (expire);
      `);
    }

    // Создание представления для удобного получения данных
    await client.query(`
      CREATE OR REPLACE VIEW quiz_questions_with_answers AS
      SELECT
        q.id AS question_id,
        q.question,
        a.id AS answer_id,
        a.answer,
        a.is_correct
      FROM quiz_questions q
      LEFT JOIN quiz_answers a ON q.id = a.question_id;
    `);

    console.log('Инициализация базы данных выполнена успешно');
  } catch (err) {
    console.error('Ошибка подключения к базе данных', err);
  } finally {
    client.release(); // Освобождение соединения с базой данных
  }
}

module.exports = { pool, initDb };

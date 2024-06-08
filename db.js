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
      const hashedPassword = await bcrypt.hash('admin', BCRYPT_COUNT);
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
          question TEXT NOT NULL,
          option1 TEXT NOT NULL,
          option2 TEXT NOT NULL,
          option3 TEXT NOT NULL,
          answer TEXT NOT NULL
        );
      `);

      // Добавление вопросов
      const questions = [
        {
          question:
            'Какие первичные средства пожаротушения являются наиболее эффективными для тушения пожара на начальной стадии?',
          option1: 'Огнетушители',
          option2: 'Пожарные краны',
          option3: 'Автоматические установки пожаротушения',
          answer: 'Огнетушители',
        },
        {
          question:
            'Какой из следующих видов огнетушителей предназначен для тушения пожаров класса B?',
          option1: 'Пенный огнетушитель',
          option2: 'Водяной огнетушитель',
          option3: 'Углекислотный огнетушитель',
          answer: 'Пенный огнетушитель',
        },
        {
          question:
            'Что необходимо сделать в первую очередь при обнаружении пожара?',
          option1: 'Покинуть помещение',
          option2: 'Сообщить в пожарную охрану',
          option3: 'Начать тушить пожар',
          answer: 'Сообщить в пожарную охрану',
        },
        {
          question:
            'Каким образом следует эвакуироваться из здания при пожаре?',
          option1: 'На лифте',
          option2: 'По лестнице',
          option3: 'Через окна',
          answer: 'По лестнице',
        },
        {
          question:
            'Что является основным средством индивидуальной защиты органов дыхания при пожаре?',
          option1: 'Противогаз',
          option2: 'Респиратор',
          option3: 'Маска',
          answer: 'Противогаз',
        },
      ];
      for (const q of questions) {
        await client.query(
          'INSERT INTO quiz_questions (question, option1, option2, option3, answer) VALUES ($1, $2, $3, $4, $5)',
          [q.question, q.option1, q.option2, q.option3, q.answer],
        );
      }

      // Создание таблицы результатов викторины
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_results (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
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

    console.log('Инициализация базы данных выполнена успешно');
  } catch (err) {
    console.error('Ошибка подключения к базе данных', err);
  } finally {
    client.release(); // Освобождение соединения с базой данных
  }
}

module.exports = { pool, initDb };

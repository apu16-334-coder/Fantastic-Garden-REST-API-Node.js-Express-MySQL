const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: console.log
    }
)

async function ensureDatabase() {
    // Temporary connection without database
    const tempSequelize = new Sequelize(
        null,
        process.env.DB_USER,
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            logging: false
        }
    );

    await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`✅ Database "${process.env.DB_NAME}" created or already exists`);
    await tempSequelize.close();
}

// Async function to establish a connection to MYsql
async function connectDB() {
    try {
        // Check for required environment variables
        if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_PORT) {
            throw new Error("Missing database environment variables");
        }

        // Ensure database exists
        await ensureDatabase();

        // connect mysql connection through sequelize
        await sequelize.authenticate();

        // Log success (only for development/debugging)
        console.log("DB connected");

        // If database already exists, just sync tables
        await sequelize.sync();
        // ✅ Creates tables from models

    } catch (error) {
        // Log the connection errors
        console.error('Mysql connection error:', error);

        // Exit the process with failure code 1
        process.exit(1);
    }
}

module.exports = { connectDB, sequelize }
const { Sequelize } = require("sequelize");
const fs = require("fs");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'production' ? false : console.log,

        dialectOptions: {
            ssl: {
                ca: fs.readFileSync('./certs/isrgrootx1.pem')
            }
        },
    }
)

// Async function to establish a connection to MYsql
async function connectDB() {
    try {
        // Check for required environment variables
        if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_PORT) {
            throw new Error("Missing database environment variables");
        }

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
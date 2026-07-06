// Load environment variables from .env file
require("dotenv").config();

const app = require("./src/app.js");
const { connectDB } = require("./src/config/database.js");

// Catch synchronous errors anywhere in the app
//    e.g., coding mistakes, reference errors
//    Ensures app doesn’t crash silently
process.on("uncaughtException", (err) => {
    console.error("[CRASH] UNCAUGHT EXCEPTION:", err.message);
    console.error(err.stack); // Full stack trace
    process.exit(1);          // Exit app because state may be unstable
});

// Wrapped in async function to handle DB connection and server starting
const startServer = async () => {
    try {
        // Connect to Mysql
        await connectDB();

        // Start Express server
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`[SERVER] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        })

        // Catch unhandled promise rejections
        // Close server gracefully before exiting
        process.on("unhandledRejection", (err) => {
            console.error("[CRASH] UNHANDLED REJECTION:", err.message);
            server.close(() => process.exit(1));
        });

    } catch (err) {
        // Startup failure (DB connection failed, etc.)
        console.error("[CRASH] Startup error:", err.message);
        process.exit(1);
    }
};

// Run the server
startServer();
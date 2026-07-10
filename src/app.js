// Load dependencies
const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const rateLimit = require("express-rate-limit");

const app = express()
const authRouter = require("./routes/auth.route.js")
const staffRouter = require("./routes/staff.route.js")
const productRouter = require("./routes/product.route.js")
const { noRouteFound, globalErrorHandler } = require('./middleware/error.middleware.js')

const { protect } = require("./middleware/auth.middleware.js");

// ✔ Query parser extended
app.set('query parser', 'extended');

// Security middlewares
app.use(helmet())
app.use(cors())

// Body parser: limit JSON size to 10kb to prevent large payload abuse
app.use(express.json({ limit: "10kb" }))

// Rate Limiter: limit requests to 100 per IP per hour
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter);

// Health route
app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "API running"
    })
})

/* ---------- ROUTES ---------- */

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/staffs', protect, staffRouter);
app.use('/api/v1/products', protect, productRouter);

/* ---------- ERROR HANDLERS ---------- */

app.use(noRouteFound)

app.use(globalErrorHandler)

module.exports = app;
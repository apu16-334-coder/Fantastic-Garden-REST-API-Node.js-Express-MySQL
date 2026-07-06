const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database")

const Order = sequelize.define('Order', {
    OrderId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    OrderDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    TotalCost: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    CustomerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    OrderStatus: {
        type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
    },
    CancellationReason: {
        type: DataTypes.STRING(200),
        allowNull: true,
    }
}, {
    tableName: 'orders',
    timestamps: false
})

module.exports = Order;
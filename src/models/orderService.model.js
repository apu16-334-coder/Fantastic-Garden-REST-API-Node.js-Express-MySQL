const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

const OrderService = sequelize.define('OrderService', {
    OrderServiceId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    OrderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ServiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    StaffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'orderservice',
    timestamps: false,
});

module.exports = OrderService;
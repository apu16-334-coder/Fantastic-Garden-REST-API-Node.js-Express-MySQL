const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

const OrderProduct = sequelize.define('OrderProduct', {
    OrderProductId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    OrderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ProductId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    Quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
}, {
    tableName: 'orderproduct',
    timestamps: false,
});

module.exports = OrderProduct;
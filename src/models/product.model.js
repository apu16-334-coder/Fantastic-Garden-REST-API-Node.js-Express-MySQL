const {DataTypes} = require("sequelize");

const {sequelize} = require("../config/database")

const Product = sequelize.define('Product', {
    ProductId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    ProductName: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    UnitPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'product',
    timestamps: false
})

module.exports = Product;
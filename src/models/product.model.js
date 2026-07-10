const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database")

const Product = sequelize.define('Product', {
    ProductId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    ProductName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notNull: { msg: 'ProductName is required' },
            notEmpty: { msg: 'ProductName can not be empty' },
            len: { args: [0, 30], msg: 'ProductName must be 3-30 character' }
        }
    },
    UnitPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'UnitPrice is required' },
            notEmpty: { msg: 'UnitPrice is can not be empty' },
        }
    },
}, {
    tableName: 'product',
    timestamps: false,
    hooks: {
        beforeValidate: async (staff) => {
            if (staff.ProductName) staff.ProductName = staff.ProductName.trim();
        },
    },
})

module.exports = Product;
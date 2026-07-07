const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const bcrypt = require("bcrypt");

const Customer = sequelize.define('Customer', {
    CustomerId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    CustomerName: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: {
            notNull: { msg: 'CustomerName is required' },
            notEmpty: { msg: 'CustomerName can not be empty' },
            len: { args: [3, 30], msg: 'CustomerName must be 3-30 characters' },
        }
    },
    CustomerAddress: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notNull: { msg: 'CustomerAddress is required' },
            notEmpty: { msg: 'CustomerAddress can not be empty' },
            len: {
                args: [0, 50],
                msg: 'CustomerAddress cannot exceed 50 characters'
            }
        }
    },
    CustomerEmail: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            msg: 'This email is already registered'
        },
        validate: {
            isEmail: {
                msg: 'Please provide a valid email address'
            },
            notNull: { msg: 'CustomerEmail is required' },
            notEmpty: { msg: 'CustomerEmail can not be empty' },
            len: {
                args: [0, 50],
                msg: 'CustomerEmail cannot exceed 50 characters'
            }
        }
    },
    Password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: { msg: 'Password is required' },
            notEmpty: { msg: 'Password is can not be empty' },
            len: { args: [8], mesg: 'Password must be at least 8 characters' }
        }
    },
    PhoneNumber: {
        type: DataTypes.STRING(15),
        allowNull: false,
        validate: {
            notNull: { msg: 'Phone number is required' },
            notEmpty: { msg: 'Phone number can not be empty' },
            is: {
                args: /^\+[0-9]{1,3}[0-9]{7,14}$/,
                msg: 'Phone number must be in international format: +[country code][number] (e.g., +8801712345678)'
            }
        }
    },
    PasswordChangeAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'customer',
    timestamps: false,
    defaultScope: {
        attributes: { exclude: ['Password'] },
    },
    hooks: {
        beforeValidate: async (customer) => {
            if (customer.CustomerName) customer.CustomerName = customer.CustomerName.trim();

            if (customer.CustomerAddress) customer.CustomerAddress = customer.CustomerAddress.trim();

            if (customer.CustomerEmail) customer.CustomerEmail = customer.CustomerEmail.trim();

            // Hash password if present
            if (customer.Password) {
                customer.Password = await bcrypt.hash(customer.Password, 12);
            }
        },
        beforeUpdate: (customer) => {
            if(customer.changed('Password')) {
                customer.PasswordChangeAt = Date.now() -1000;
            }
        }
    },   
}) 

module.exports = Customer;
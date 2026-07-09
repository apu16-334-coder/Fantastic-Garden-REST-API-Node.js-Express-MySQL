const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database")

const bcrypt = require("bcrypt");

const Staff = sequelize.define('Staff', {
    StaffId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    StaffName: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: {
            notNull: { msg: 'StaffName is required' },
            notEmpty: { msg: 'StaffName can not be empty' },
            len: { args: [0, 30], msg: 'StaffName must be 3-30 character' }
        }
    },
    StaffEmail: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            msg: 'This email is already registered'
        },
        validate: {
            isEmail: {
                msg: 'Please provide a valid email address'
            },
            notNull: { msg: 'StaffEmail is required' },
            notEmpty: { msg: 'StaffEmail can not be empty' },
            len: {
                args: [0, 50],
                msg: 'StaffEmail cannot exceed 50 characters'
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
    Role: {
        type: DataTypes.ENUM('admin', 'staff'),
        defaultValue: 'staff',
        allowNull: false,
    },
    PasswordChangeAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    }
}, {
    tableName: 'staff',
    timestamps: false,
    defaultScope: {
        attributes: { exclude: ['Password', 'PasswordChangeAt'] },
    },
    hooks: {
        beforeValidate: async (staff) => {
            if (staff.StaffName) staff.StaffName = staff.StaffName.trim();

            if (staff.StaffEmail) staff.StaffEmail = staff.StaffEmail.trim();

            // Hash password if present
            if (staff.Password) {
                staff.Password = await bcrypt.hash(staff.Password, 12);
            }
        },
        beforeUpdate: (staff) => {
            if(staff.changed('Password')) {
                staff.PasswordChangeAt = Date.now() - 1000;
            }
        }
    },
})

module.exports = Staff;
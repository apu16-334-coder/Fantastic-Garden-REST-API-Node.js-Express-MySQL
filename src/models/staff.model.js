const {DataTypes} = require("sequelize");

const {sequelize} = require("../config/database")

const Staff = sequelize.define('Staff', {
    StaffId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    StaffName: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    Email: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    Password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    Role: {
        type: DataTypes.ENUM('admin', 'staff'),
        defaultValue: 'staff',
    }
}, {
    tableName: 'staff',
    timestamps: false
})

module.exports = Staff;
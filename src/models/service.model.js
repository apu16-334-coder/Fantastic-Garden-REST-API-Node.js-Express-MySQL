const {DataTypes} = require("sequelize");

const {sequelize} = require("../config/database")

const Service = sequelize.define('Service', {
    ServiceId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    ServiceName: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    ServiceFee: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'service',
    timestamps: false
})

module.exports = Service;
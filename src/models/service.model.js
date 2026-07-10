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
        validate: {
            notNull: { msg: 'ServiceName is required' },
            notEmpty: { msg: 'ServiceName can not be empty' },
            len: { args: [0, 50], msg: 'ServiceName must be 3-30 character' }
        }
    },
    ServiceFee: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'ServiceFee is required' },
            notEmpty: { msg: 'ServiceFee is can not be empty' },
        }
    },
    IsDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'service',
    timestamps: false
})

module.exports = Service;
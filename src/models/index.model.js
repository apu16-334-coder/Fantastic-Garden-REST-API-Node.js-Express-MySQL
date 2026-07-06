const { sequelize } = require("../config/database.js");
const Customer = require("./customer.model.js");
const Staff = require("./staff.model.js");
const Product = require("./product.model.js");
const Service = require("./service.model.js");
const Order = require("./order.model.js");
const OrderProduct = require("./orderProduct.model.js");
const OrderService = require("./orderService.model.js");

// Customer <-> Order (one-to-many)
Customer.hasMany(Order, { foreignKey: 'CustomerId' });
Order.belongsTo(Customer, { foreignKey: 'CustomerId' });

// Order <-> Product (many-to-many through OrderProduct)
Order.belongsToMany(Product, { through: OrderProduct, foreignKey: 'OrderId' });
Product.belongsToMany(Order, { through: OrderProduct, foreignKey: 'ProductId' });

// Order <-> Service (many-to-many through OrderService)
Order.belongsToMany(Service, { through: OrderService, foreignKey: 'OrderId' });
Service.belongsToMany(Order, { through: OrderService, foreignKey: 'ServiceId' });

// Staff <-> OrderService (one-to-many: a staff member handles many order-service line items)
Staff.hasMany(OrderService, { foreignKey: 'StaffId' });
OrderService.belongsTo(Staff, { foreignKey: 'StaffId' });

// Direct access to junction table rows (useful for quantity, per-service staff lookups)
Order.hasMany(OrderProduct, { foreignKey: 'OrderId' });
OrderProduct.belongsTo(Order, { foreignKey: 'OrderId' });
OrderProduct.belongsTo(Product, { foreignKey: 'ProductId' });

Order.hasMany(OrderService, { foreignKey: 'OrderId' });
OrderService.belongsTo(Order, { foreignKey: 'OrderId' });
OrderService.belongsTo(Service, { foreignKey: 'ServiceId' });

module.exports = {
    sequelize,
    Customer,
    Staff,
    Product,
    Service,
    Order,
    OrderProduct,
    OrderService,
};
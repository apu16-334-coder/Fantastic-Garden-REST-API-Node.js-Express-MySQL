const { Op } = require('sequelize');

/**
 * ApiFeatures class for building advanced MongoDB queries
 * Handles filtering, searching, sorting, and pagination
 */
class ApiFeatures {
    /**
    * Create an instance of ApiFeatures
    * @param {Object} queryObj - Query parameters from req.query
    */
    constructor(queryObj) {
        this.queryObj = queryObj;

        this.options = {}
    }

    /**
     * Apply filters to the query
     * Supports:
     * - Field filtering (e.g., ?role=admin)
     * - Multiple values using commas (e.g., ?role=admin,member)
     * - Comparison operators: gte, gt, lte, lt (e.g., ?createdAt[gte]=2024-01-01)
     * @returns {ApiFeatures} - Returns this for method chaining
     */
    filter() {
        const customQueryObj = { ...this.queryObj };

        // Make boolean string to boolean value
        if(customQueryObj.IsActive) {
            customQueryObj.IsActive = customQueryObj.IsActive === 'true'
        }

        // Remove page limit sort search query fields for further query make
        ['page', 'limit', 'sort', 'search'].forEach(el => delete customQueryObj[el])

        Object.keys(customQueryObj).forEach(key => {
            // Convert comparison operators
            // Example: ?StaffId[gte]=6(StaffId: { gte: '6', lte: '1019' }) → StaffId: { [Op.gte]: 6 }
            if (typeof customQueryObj[key] === 'object' && customQueryObj[key] !== null) {
                const tempObj = {}
                Object.keys(customQueryObj[key]).forEach(cmpOp => {
                    const sequelizeOp = { gte: Op.gte, gt: Op.gt, lte: Op.lte, lt: Op.lt }[cmpOp];
                    tempObj[sequelizeOp] = customQueryObj[key][cmpOp]
                })

                customQueryObj[key] = { ...tempObj }
            }

            // Convert comma-separated values
            // Example: ?Role=staff,admin(Role: 'staff,admin',) → StaffId: Role: { Symbol(in): [ 'staff', 'admin' ] }
            else if (typeof customQueryObj[key] === 'string' && customQueryObj[key].includes(',')) {
                const values = customQueryObj[key].split(',');
                customQueryObj[key] = { [Op.in]: values };
            }
        })

        this.options.where = { ...customQueryObj };
        return this;
    }

    /**
     * Apply text search across multiple fields
     * @param {...string} fields - Field names to search in (e.g., 'name', 'email')
     * @returns {ApiFeatures} - Returns this for method chaining
     * @example .search('name', 'email') // Searches both fields for the term
     */
    search(...fields) {
        if (this.queryObj.search) {
            this.options.where[Op.or] = fields.map((field) => {
                return { [field]: { [Op.like]: `%${this.queryObj.search}%` } }
            })
        }
        return this;
    }

    /**
     * Apply sorting to the query
     * Default sort: newest first (-createdAt)
     * @returns {ApiFeatures} - Returns this for method chaining
     * @example ?sort=name,-createdAt (sort by name ascending, then newest first)
     */
    sort() {
        if(this.queryObj.sort) {
            this.options.order =  this.queryObj.sort.split(',').map(field => 
                field.startsWith('-') 
                    ? [field.substring(1), 'DESC'] 
                    : [field, 'ASC']
            )
        }
        return this;
    }

    /**
     * Apply pagination to the query
     * Default: page=1, limit=10
     * @returns {ApiFeatures} - Returns this for method chaining
     * @example ?page=2&limit=20 (gets 20 items from page 2)
     */
    pagination() {
        this.page = +this.queryObj.page || 1;
        this.options.limit = +this.queryObj.limit || 10;
        this.options.offset = (this.page - 1) * this.options.limit;
             
        return this
    }
}

module.exports = ApiFeatures;

const validateOrderInput = (products =[], services =[]) => {
    let err = [];

    // checking they are error or not
    if (!Array.isArray(products)) err.push('Prodcuts must be an array');
    if (!Array.isArray(services)) err.push('Services must be an array');

    // if caught error then return
    if (err.length > 0) return err;

    // Loop products array
    products.forEach((p, i) => {
        // checking if ProductId is missing
        if(!p.ProductId) err.push(`products[${i}] is missing ProductId`);

        // checking if Quantity is missing and not  a postive number
        if(p.Quantity === undefined) {
             err.push(`products[${i}] is missing Quantity`)
        } else if(typeof p.Quantity !== 'number' || p.Quantity <= 0) {
            err.push(`products[${i}].Quantity is not a positive number.`);
        }         
    });

    // Loop services array
    services.forEach((s, i) => {
        // checking if ProductId is missing
        if(!s.ServiceId) err.push(`Services[${i}] is missing ServiceId`);
    })

    return err;
}

module.exports = validateOrderInput
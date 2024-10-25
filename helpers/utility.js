const Order = require('../model/orderModel') 


const bcrypt = require('bcrypt');
const { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

//hasing passwords 
const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash

    } catch (error) {
        console.log(error.message);
    }
}

//Otp generation 
const generateRandom4Digit = async()=>{
    return Math.floor(1000+Math.random()*9000)  //this will give me a random 4 digit number from 1000 to 9000 
}

//Caluculation
const calculateCartTotals = (cart) => { 
    cart.totalRegularPrice = cart.items.reduce((total, item) => total + item.regularPrice * item.quantity, 0);
    cart.totalSalePrice = cart.items.reduce((total, item) => total + (item.OfferSalePrice || item.salePrice) * item.quantity, 0);
    cart.actualSalePrice = cart.totalSalePrice
    cart.discount = cart.totalRegularPrice - cart.totalSalePrice;
    cart.totalItems = cart.items.length;
};

//---------------------------------------getDateRange function ---------------------------------------
const getDateRange = (query) => {
    console.log(query)
    // let startDate = query.startDate;
    // let endDate = query.endDate;
    // let filter = query.filter;

    let { startDate, endDate, filter } = query; // disructive way

    console.log('startDate',startDate)
    console.log('endDate',endDate)
    console.log('filter',filter)

    if (filter === 'today') {
        startDate = startOfToday();
        endDate = endOfToday();
    } else if (filter === 'thisWeek') {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(startDate, { weekStartsOn: 1 });
    } else if (filter === 'thisMonth') {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(startDate);
    } else if (startDate && endDate) {
        startDate = new Date(startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);
    } else {
        return null;
    }
    return { startDate, endDate };
};


//--------------------------------------------------generateSaleReport function ------------------------------------------
const generateSaleReport = async(startDate,endDate)=>{
    
    try {
        const query = {
            orderDate: {
                $gte: startDate,
                $lte: endDate
            }
        };
    
        const salesSummary = {
            totalSales: 0,
            totalOrders: 0,
            totalDelivered: 0,
            totalCanceled: 0
        };
    
        const orders = await Order.find(query).lean().sort({ orderDate: -1 });  // *7) why included lean() ?
    
        salesSummary.totalOrders = orders.length;
    
        orders.forEach(order => {
            salesSummary.totalSales += order.totalSalePrice || 0;
            order.items.forEach(item => {
                if (item.OrderStatus === 'Delivered') {
                    salesSummary.totalDelivered += 1;
                } else if (item.OrderStatus === 'Canceled') {
                    salesSummary.totalCanceled += 1;
                }
            });
        });
    
        return {orders,salesSummary} // Returning as an object

    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    securePassword,
    generateRandom4Digit,
    calculateCartTotals,
    
    getDateRange,
    generateSaleReport
}
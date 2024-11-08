const Order = require('../model/orderModel') 


const bcrypt = require('bcrypt');

//const { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
//const { addDays, addHours, addMonths, format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear } = require('date-fns');  // used in generateSalesData
const { startOfToday,endOfToday,addDays, addHours, addMonths, format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear } = require('date-fns');  // used in generateSalesData


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
    let startDate = query.startDate;
    let endDate = query.endDate;
    let filter = query.filter;

    //let { startDate, endDate, filter } = query; // disructive way

    console.log('startDate',startDate)
    console.log('endDate',endDate)
    console.log('filter',filter)

    if (filter === 'today') {
        startDate = startOfToday();
        endDate = endOfToday();
    } else if (filter === 'thisWeek') {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start    (default is weekStartsOn : 0, Which is sunday & for default thing u know u dont need to mention it ) 
        startDate.setUTCHours(0, 0, 0, 0); // Set to 12:00 AM
        console.log(startDate)
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        endDate.setUTCHours(23, 59, 59, 999); // Set to 11:59 PM on Sunday
        console.log(endDate)
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
            totalReturned : 0,
            totalCanceled: 0
        };
    
        const orders = await Order.find(query).lean().sort({ orderDate: -1 });    // *7) why included lean() ?
        
    
        salesSummary.totalOrders = orders.length;
    
        orders.forEach(order => {
            order.items.forEach(item => {

                if (item.OrderStatus === 'Delivered' || item.OrderStatus === 'Return-Rejected') {
                    salesSummary.totalSales += item.salePrice

                    if(order.coupon && order.coupon.id ){
                        salesSummary.totalSales -= order.coupon.discount
                    }
                    salesSummary.totalDelivered += 1;
                    

                } else if (item.OrderStatus === 'Canceled') {
                    salesSummary.totalCanceled += 1;

                } else if(item.OrderStatus === 'Returned'){
                    
                    salesSummary.totalReturned += 1;
                }
            });
        });

        return {orders,salesSummary} // Returning as an object

    } catch (error) {
        console.log(error.message);
    }
}
/****************************************************************************************************************************************************************************** */
const generateSalesDataForGraph = async (timeframe) => {
    const today = new Date();
    let xValues = [];
    let yValues = [];

    let startDate, endDate;

    switch (timeframe) {
        case 'day':
            startDate = startOfDay(today);
            endDate = endOfDay(today);
            for (let i = 0; i < 24; i++) {
                const hour = addHours(startDate, i); // hour =>  5/11/2024, 12:00:00 am  5/11/2024, 1:00:00 am 5/11/2024, 2:00:00 am

                xValues.push(format(hour, 'HH:00')); //formated hour (changed the format ) => '00:00', '01:00', '02:00','03:00', '04:00', '05:00'
                const sales = await Order.aggregate([
                    { $match: { orderDate: { $gte: hour, $lt: addHours(hour, 1) } } },
                    { $group: { _id: null, total: { $sum: '$totalSalePrice' } } }
                ]);
                yValues.push(sales[0] ? sales[0].total : 0);
            }
            break;
        case 'week':
            startDate = startOfWeek(today);
            endDate = endOfWeek(today);
            const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            xValues = weekDays;
            for (let i = 0; i < 7; i++) {
                const day = addDays(startDate, i);
                const sales = await Order.aggregate([
                    { $match: { orderDate: { $gte: day, $lt: addDays(day, 1) } } },
                    { $group: { _id: null, total: { $sum: '$totalSalePrice' } } }
                ]);
                yValues.push(sales[0] ? sales[0].total : 0);
            }
            break;
        case 'month':
            startDate = startOfMonth(today);
            endDate = endOfMonth(today);
            const daysInMonth = endDate.getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const day = addDays(startDate, i - 1);
                xValues.push(format(day, 'dd'));
                const sales = await Order.aggregate([
                    { $match: { orderDate: { $gte: day, $lt: addDays(day, 1) } } },
                    { $group: { _id: null, total: { $sum: '$totalSalePrice' } } }
                ]);
                yValues.push(sales[0] ? sales[0].total : 0);
            }
            break;
        case 'year':
            startDate = startOfYear(today);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            xValues = months;
            for (let i = 0; i < 12; i++) {
                const month = addMonths(startDate, i);
                const sales = await Order.aggregate([
                    { $match: { orderDate: { $gte: month, $lt: addMonths(month, 1) } } },
                    { $group: { _id: null, total: { $sum: '$totalSalePrice' } } }
                ]);
                yValues.push(sales[0] ? sales[0].total : 0);
            }
            break;
    }

    return { xValues, yValues };
};
/**************************************************************************************************************************************************** */
module.exports = {
    securePassword,
    generateRandom4Digit,
    calculateCartTotals,
    
    getDateRange,
    generateSaleReport,
    

    generateSalesDataForGraph//(graph days and data)
}
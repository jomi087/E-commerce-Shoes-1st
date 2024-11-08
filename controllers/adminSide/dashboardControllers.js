const Order = require("../../model/orderModel")
const Product = require("../../model/productModel")
const Category = require("../../model/categoryModel")
const User = require("../../model/userModel")


const {generateSalesDataForGraph} = require('../../helpers/utility')
/*********************************Dashboard*********************************************/
const loadDashboard = async(req,res)=>{
    try {

        const summary = {
            totalSales: 0,
            ordersCount: 0,
            productCount: 0,
            categoryCount : 0,
            userCount: 0,
            userBlockCount :0
        };  
        
        const [orders, productCount,categoryCount,userStats] = await Promise.all([
            Order.find(),
            Product.countDocuments({forSale:true}),
            Category.countDocuments({}),
            User.aggregate([     
                {
                    $match: { isAdmin: false }
                },
                {
                    $group: {
                        _id: "$isBlocked",
                        count: { $sum: 1 }
                    }
                }
            ]),     // grouped item will be given a array format  [ { _id: false, count: 2 }, { _id: true, count: 1 } ]

            // instead of writting like this
            // User.countDocuments({isBlocked : false ,isAdmin : false}),
            // User.countDocuments({isBlocked : true ,isAdmin : false})   // i used aggregatioin  above
        ]);

        orders.forEach((order)=>{
            order.items.forEach((item)=>{
                if(item.OrderStatus === 'Delivered'){
                    summary.totalSales  +=  item.salePrice
                }
            })
            if(order.coupon && order.coupon.id ){
                summary.totalSales -= order.coupon.discount
            }
        })

        summary.ordersCount = orders.length;
        summary.productCount = productCount;
        summary.categoryCount = categoryCount;
       

        userStats.forEach(stat => {
            if (stat._id === false) {
                summary.userCount = stat.count; // Unblocked users
            } else if (stat._id === true) {
                summary.userBlockCount = stat.count; // Blocked users
            }
        });


      

        res.render('adminDashboard',{summary,})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
} 
/****************************************************************graphReresentalReport****************************************************************************/
// const graphRepresentalReport = async(req,res)=>{
//     try {
//         const timeFrame = req.query.timeframe
//         console.log(timeFrame)

//         res.json({
//             success: true,
//             timeFrame
//         })
//     } catch (error) {
//         console.log(error.message);
//         return res.status(500).redirect('/error');
//     }
// }

const graphRepresentalReport = async(req,res)=>{
    try {
        const { timeframe } = req.query;
        const data = await generateSalesDataForGraph(timeframe);
        res.json(data);
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}





module.exports  = {
    loadDashboard,
    graphRepresentalReport
}
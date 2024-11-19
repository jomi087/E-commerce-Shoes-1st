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

        //Top Selling ProductsDetials with Category 
        let topSellingProducts = await Order.aggregate([
            { $unwind: '$items' },
            { $match: { 'items.OrderStatus': 'Delivered' } },
            {
                $group: {
                    _id: '$items.product',                 // Group by product ID
                    totalSold: { $sum: '$items.quantity' } // Sum quantities for each product
                }
            },
            { $sort: { totalSold: -1 } },                  // Sort by totalSold in descending order
            { $limit: 1 },                                 // Limit to top 3 products
            {
                $lookup: {
                    from: 'shoes',                         // Collection name of Shoe
                    localField: '_id',                     // Product ID from group stage
                    foreignField: '_id',                   // Match with _id in Shoe collection
                    as: 'productDetails'
                }
            },
            { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } }, // Unwind productDetails array
            {
                $lookup: {
                    from: 'categories',                    // Collection name of Category
                    localField: 'productDetails.category', // Category ID from Shoe
                    foreignField: '_id',                   // Match with _id in Category collection
                    as: 'productDetails.category'          // Assign result to category field inside productDetails
                }
            },
            { $unwind: { path: '$productDetails.category', preserveNullAndEmptyArrays: true } }, // Unwind category to make it an object
            {
                $project: {
                    _id: 0,                                  // Exclude the product ID from output
                    totalSold: 1,                            // Include totalSold
                    productDetails: 1                        // Include productDetails with embedded category details
                }
            }
        ]);
    
        // console.log("bestSellingProducts1",topSellingProducts)
       

        orders.forEach((order)=>{
            order.items.forEach((item)=>{
                if(item.OrderStatus === 'Delivered'|| item.OrderStatus === 'Return-Rejected'){
                    summary.totalSales  +=  item.salePrice * item.quantity
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


        res.render('adminDashboard',{summary, productDetails : topSellingProducts[0].productDetails})
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
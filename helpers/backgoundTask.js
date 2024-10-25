const cron = require('node-cron');
const Order = require('../model/orderModel'); 
const Wallet = require('../model/walletModel')
const Category = require('../model/categoryModel')
const Product  = require('../model/productModel');

const { find } = require('../model/userModel');

const schedulePendingPaymentCheck = () => {
    cron.schedule('* * * * *', async () => {   //5 star means ->  minute hour day(of a month) month week
        try {
            const currentTime = new Date();
            console.log(currentTime);

            const fiveMinutesAgoTime = new Date(currentTime - 5 * 60 * 1000);  //currenttime - 5 mints  = 15mints before time 
            console.log(fiveMinutesAgoTime);
            
           
            // To change the pending status  to cancel in the case of order payment not done in  5 mints  
            const ordersToCancel = await Order.find({'items.OrderStatus': 'Pending Payment',orderDate: { $lte: fiveMinutesAgoTime }}); 
            console.log('ordersToCancel-',ordersToCancel);  // This means "find all orders where orderDate is less than or equal to 15 minutes ago."
            
            // for (const order of ordersToCancel) {
            //     if(order.paymentStatus === 'Pending'){
            //         order.paymentStatus = 'Canceled'
            //     }
            //     order.items.forEach(item => {
            //         if (item.OrderStatus === 'Pending Payment') {
            //             item.OrderStatus = 'Canceled';
            //         }
            //     });

            //     await order.save();
            //     console.log(`Order ${order._id} status updated to Canceled due to pending payment.`);
            // }
            //instead of these we can do with promise.all

            await Promise.all(
                ordersToCancel.map(async (order) => {
                  if(order.paymentStatus === 'Pending'){
                    order.paymentStatus = 'Canceled';
                    order.totalSalePrice = 0
                  }
                  order.items.forEach(item => {
                    if (item.OrderStatus === 'Pending Payment') {
                      item.OrderStatus = 'Canceled';
                    }
                  });
                  await order.save();
                  console.log(`Order ${order._id} status updated to Canceled due to pending payment.`);
                })
            );

            // To change the pending status  to cancel in the case of wallet  payment not done in  15 mints  
            const walletsToUpdate  = await Wallet.find({'transactions.status' : 'pending' , 'transactions.createdAt':{ $lte: fiveMinutesAgoTime }})
            console.log('walletsToUpdate -',walletsToUpdate );

            for(const wallet of walletsToUpdate){

                wallet.transactions.forEach(transaction =>{
                    if(transaction.status === 'pending' && transaction.createdAt <= fiveMinutesAgoTime  ){
                        transaction.status = 'failed'
                    }
                })
                await wallet.save();
            }

            //To activate offer   
            const categories = await Category.find()
            for (const category of categories) {
                if (category.offer && category.offer.startDate && category.offer.endDate) {
                    //startDate is a string and new Date is an object so the comaparision will not wrk   that y conversted the startDate in to obeject to comapair
                    const startDate = new Date(category.offer.startDate);
                    const endDate = new Date(category.offer.endDate);


                    // Remove time component from both currentTime and endDate 
                    const currentDateOnly = new Date();
                    currentDateOnly.setHours(0, 0, 0, 0);

                    const startDateOnly = new Date(startDate); 
                    startDateOnly.setHours(0, 0, 0, 0);

                    const endDateOnly = new Date(endDate); // Strip time
                    endDateOnly.setHours(23, 59, 59, 999); // Full end of the day

                    // Offer is active if current time is equal to or after startDate but before endDate
                    if (currentDateOnly >= startDateOnly && currentDateOnly <= endDateOnly) {

                        category.offer.status = true; // Offer is active

                        const categoryBasedProducts = await Product.find({category : category._id})

                        if(categoryBasedProducts.length === 0){
                            console.log(`No product found for category ${category.name}, OFFER STARTED`)
                        }else {
                            
                            await Promise.all(                                           // Calculate OfferSalePrice for each product
                                categoryBasedProducts.map(async (product) => {
                                    product.OfferSalePrice = Math.floor(product.salePrice  * (1 - category.offer.discount / 100));
                                    await product.save();
                                })
                            );
                            console.log(`${category.name} Category Offer, started`);
                        }
                    }else if(currentDateOnly > endDateOnly ){
                        category.offer.status = false; // Offer is expired

                         await Product.updateMany({ category : category._id},{$unset :{OfferSalePrice : 1}})

                       
                        console.log(`${category.name}Category Offer, Expired`)

                    }else{

                        category.offer.status = false; // Offer is not started
                        console.log(`${category.name} Category Offer, Not Started`)

                    }
                    await category.save();
                }else{
                    console.log(`${category.name} Category has  No offer added`)
                }
            }
        } catch (error) {
            console.error('Error checking for pending payments:', error);
        }
    });
};

module.exports = schedulePendingPaymentCheck;

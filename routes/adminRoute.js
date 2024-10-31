const express = require('express');
const admin_route = express()

admin_route.set('view engine','ejs')
admin_route.set('views','./views/admin')
admin_route.use(express.static('./public'))
admin_route.use(express.json())
admin_route.use(express.urlencoded({extended:true}))


/***************************************************************************** */
const adminControllers = require('../controllers/adminSide/adminControllers')
const   dashboardControllers = require('../controllers/adminSide/dashboardControllers')
const   customerControllers = require('../controllers/adminSide/customerControllers')
const   productControllers = require('../controllers/adminSide/productControllers')
const   orderControllers = require('../controllers/adminSide/orderControllers')
const   categoryControllers = require('../controllers/adminSide/categoryControllers')
const   couponControllers = require('../controllers/adminSide/couponControllers')
const   salesControllers = require('../controllers/adminSide/salesControllers')

const adminAuth = require('../middleware/adminAuth')   
const upload = require('../helpers/multer')
// const imageresizer = require('../helpers/sharp') // code written  but not implimented          imageresizer.multimageCrop,   <-----you need to add this  below
/*****************************************************************************/

//login
admin_route.get('/' , adminAuth.isLogout , adminControllers.loadLogin)  
admin_route.post('/', adminAuth.isLogout , adminControllers.verifyLogin)


//dashboard
admin_route.get('/dashboard', adminAuth.isLogin , dashboardControllers.loadDashboard)

//customer
admin_route.get('/customer' , adminAuth.isLogin , customerControllers.usersDetails)
admin_route.get('/userStatus' , adminAuth.isLogin ,  customerControllers.userStatus)

//product 
admin_route.get('/product' , adminAuth.isLogin , productControllers.productDetails) 
admin_route.get('/addProduct' , adminAuth.isLogin , productControllers.addProductPage) 
admin_route.post('/addProduct', adminAuth.isLogin , upload.array('Pimages',5),productControllers.addProduct) 
admin_route.get('/editProduct' , adminAuth.isLogin , productControllers.editProductPage)   
admin_route.patch('/productStatus',adminAuth.isLogin , productControllers.productStatus)     
admin_route.post('/editProduct', adminAuth.isLogin , upload.array('Pimages',5),productControllers.editProduct)  //recomended to use patch 
//admin_route.post('/deleteProduct', adminAuth.isLogin , productControllers.deleteProduct) //recomended to use delete


//order
admin_route.get('/orderManagement' , adminAuth.isLogin , orderControllers.orderManagementPage)
admin_route.get('/orderDetails/:id' , adminAuth.isLogin , orderControllers.orderDetailPage)
admin_route.patch('/orderStatus/:id', adminAuth.isLogin , orderControllers.orderUpdateStatus)
admin_route.patch('/returnOrderRequest/:id', adminAuth.isLogin , orderControllers.returnRequest)


//category
admin_route.get('/category' , adminAuth.isLogin , categoryControllers.categoryDetails)
admin_route.post('/addCategory' , adminAuth.isLogin , categoryControllers.addCategory) 
admin_route.patch('/categoryStatus', adminAuth.isLogin , categoryControllers.categoryStatus)
admin_route.get('/editCategory' , adminAuth.isLogin , categoryControllers.editCategoryPage)  
admin_route.post('/editCategory' , adminAuth.isLogin , categoryControllers.editCategory)  //recomended to use patch 

//categoryOffer
admin_route.get('/offer/:id',adminAuth.isLogin, categoryControllers.categoryOffer)
admin_route.post('/addOffer',adminAuth.isLogin, categoryControllers.addOffer)
admin_route.patch('/editOffer',adminAuth.isLogin, categoryControllers.editOffer)
admin_route.delete('/deleteOffer',adminAuth.isLogin, categoryControllers.deleteOffer)

//coupon mangement 
admin_route.get('/couponManagement', adminAuth.isLogin, couponControllers.couponMangementPage)
admin_route.post('/addCoupon',adminAuth.isLogin, couponControllers.addCoupon)
admin_route.get('/editCoupon/:id',adminAuth.isLogin ,couponControllers.editCouponPage)
admin_route.patch('/editCoupon',adminAuth.isLogin ,couponControllers.editCoupon)
admin_route.delete('/deleteCoupon',adminAuth.isLogin ,couponControllers.deleteCoupon)

//salesReport
admin_route.get('/salesReport',adminAuth.isLogin,salesControllers.salesReportPage)
admin_route.get('/generateSalesReport',adminAuth.isLogin,salesControllers.generateSalesReport)
admin_route.get('/downloadSalesReport',adminAuth.isLogin,salesControllers.salesReportDownload)

//logout
admin_route.get('/logout', adminAuth.isLogin , adminControllers.adminLogout)


admin_route.get('/error',adminControllers.errorpage)
admin_route.get('*',adminControllers.page404)


module.exports =admin_route
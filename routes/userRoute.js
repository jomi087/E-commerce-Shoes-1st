const express = require('express');
const  user_Route=express()

user_Route.set('view engine','ejs');
user_Route.set('views','./views/users')
user_Route.use(express.static('./public'))  

const session = require('express-session');
const passport =  require('../helpers/passport');

/*************************************************************************** */
user_Route.use(express.json())
user_Route.use(express.urlencoded({extended:true}))

user_Route.use(session({
    secret:process.env.sessionSecret,
    resave:true,
    saveUninitialized:true,
    cookie: { secure: false } 
}))

user_Route.use(passport.initialize());
user_Route.use(passport.session());


/***************************************************************************** */
const userControllers = require('../controllers/userSide/userController');
const couponControllers = require('../controllers/userSide/couponControllers')
const paymentControllers = require('../controllers/userSide/paymentControllers')
const walletControllers = require('../controllers/userSide/walletControllers');
const orderControllers = require('../controllers/userSide/orderControllers')
const addressControllers = require('../controllers/userSide/addressControllers');
const accountControllers = require('../controllers/userSide/accountControllers')
const cartControllers = require('../controllers/userSide/cartControllers');
const wishListControllers = require('../controllers/userSide/wishListControllers');
const productSurfControllers = require('../controllers/userSide/productSurfControllers');

const userAuth = require('../middleware/userAuth')  // not yet implemented need to do that ....

/***************************************************************************** */

//Surf...
user_Route.get('/', productSurfControllers.landingPage)
user_Route.get('/shop', productSurfControllers.Productspage)
user_Route.get('/productDetails', productSurfControllers.productDetails)


//Register
user_Route.get('/signup' , userAuth.isLogout , userControllers.loadSignup)
user_Route.post('/mailOtp',userControllers.sendMailOtp)
user_Route.post('/verifyOtp',userControllers.verifyOtp)
user_Route.post('/signup',userControllers.insertUser)

//Register with Google
user_Route.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}));
user_Route.get('/auth/google/callback',          // Callback route after Google OAuth
    passport.authenticate('google', {
        failureRedirect: '/login' // Redirect to login on failure
    }),
    (req, res) => {
        req.session.user_id = req.user._id; // Store user ID in session
        res.redirect('/');
    }
);
/*Route to fetch the user's phone number after authentication
    user_Route.get('/user/phone-numbers', async (req, res) => {
    try {
        // Ensure the user is authenticated
        if (!req.session.user_id) {
            return res.redirect('/login');
        }
        // Use the access token to make the API request
        const accessToken = req.session.access_token; // Ensure you have the token stored in the session
        const response = await axios.get('https://people.googleapis.com/v1/people/me?personFields=phoneNumbers', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log(response.data);
        // Send the phone numbers as a response
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching phone numbers:', error);
        res.status(500).send('An error occurred while fetching phone numbers.');
    }
})*/

//Login & forgotPassword
user_Route.route('/login')
  .get(userAuth.isLogout, userControllers.loadLogin)  // *Q8) Route chaining or method chaining ? 
  .post(userControllers.verifyLogin);
user_Route.get('/forgetPassword', userAuth.isLogout , userControllers.forgotPasswordPage)
user_Route.post('/passwordOtp',userAuth.isLogout,userControllers.verifyPasswordOtp)
user_Route.patch('/resetPassword',userAuth.isLogout ,userControllers.newPassword)

//Account 
user_Route.get('/personalInfo', userAuth.isLogin , accountControllers.userDashboard)
user_Route.get('/editProfile' , userAuth.isLogin , accountControllers.editProfilePage)
user_Route.patch('/updateProfileName' ,userAuth.isLogin, accountControllers.updateProfileName)
user_Route.patch('/updateM&M' ,userAuth.isLogin, accountControllers.updateMail_Mobile)
user_Route.get('/changePassword' , userAuth.isLogin , accountControllers.updatePasswordpage)
user_Route.patch('/changePassword' , userAuth.isLogin, accountControllers.updatePassword)
//Address 
user_Route.get('/address' , userAuth.isLogin , addressControllers.addressPage)
user_Route.get('/address/add' , userAuth.isLogin , addressControllers.addAddressPage)
user_Route.post('/address/add' , userAuth.isLogin , addressControllers.addAddress)
user_Route.get('/address/edit/:id' , userAuth.isLogin , addressControllers.editAddressPAge)
user_Route.patch('/address/update/:id' , userAuth.isLogin , addressControllers.updateAddress)  
user_Route.delete('/address/delete/:id' , userAuth.isLogin , addressControllers.deleteAddress)
user_Route.patch('/address/default/:id' , userAuth.isLogin , addressControllers.defaultAddress)

//WishList 
user_Route.get('/wishList',userAuth.isLogin,wishListControllers.productWishListPage)
user_Route.post('/wishlist/toggle',userAuth.isLogin,wishListControllers.addRemoveWishList)
user_Route.get('/wishlist/check/',userAuth.isLogin, wishListControllers.wishListStatusUpdate)

//Cart 
user_Route.get('/cart', cartControllers.cartPage)
user_Route.post('/cart/add-to-cart', cartControllers.addToCart)
user_Route.patch('/cart/update-quantity',userAuth.isLogin, cartControllers.updateQuantity)
user_Route.delete('/cart/delete-item',userAuth.isLogin, cartControllers.removeproduct)

//Order 
user_Route.get('/order/history' , userAuth.isLogin , orderControllers.orderHistory)
user_Route.patch('/order/cancel' ,userAuth.isLogin, orderControllers.orderCancellation)
user_Route.patch('/order/return' ,userAuth.isLogin,  orderControllers.orderReturn)

//Wallet 
user_Route.get('/user/wallet' , userAuth.isLogin , walletControllers.userWalletPage)
user_Route.post('/wallet/addMoney' , userAuth.isLogin , walletControllers.addMoney)
user_Route.post('/walletPayment/verify', userAuth.isLogin ,walletControllers.verifyWalletPayment)
user_Route.post('/walletpayment/verify/failed', userAuth.isLogin ,walletControllers.verifyWalletPaymentFailed)

//Coupon
user_Route.post('/couponvalidation',userAuth.isLogin,couponControllers.validateCoupon)

//Payment  
user_Route.get('/checkout',userAuth.isLogin, paymentControllers.confirmOrderPage)
user_Route.post('/address/addAddress',userAuth.isLogin, paymentControllers.addAddressFromCheckout)
user_Route.post('/address/editAddress',userAuth.isLogin, paymentControllers.editAddressFromCheckout)
user_Route.post('/checkout',userAuth.isLogin,  paymentControllers.confirmOrder)
user_Route.post('/payment/failed', userAuth.isLogin, paymentControllers.paymentFailed)
user_Route.post('/payment/verify', userAuth.isLogin, paymentControllers.verifyPayment)

//logout
user_Route.get('/logout' , userAuth.isLogin , userControllers.userLogout)

//others
user_Route.get('/error',userControllers.errorpage)
// user_Route.get('*',userControllers.page404)


module.exports=user_Route 
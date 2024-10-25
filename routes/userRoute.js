
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
const userControllers = require('../controllers/userController');
const userAuth = require('../middleware/userAuth')  // not yet implemented need to do that ....

/***************************************************************************** */

//Register
user_Route.get('/signup' , userAuth.isLogout , userControllers.loadSignup)
user_Route.post('/mailOtp',userControllers.sendMailOtp)
user_Route.post('/verifyOtp',userControllers.verifyOtp)
user_Route.post('/signup',userControllers.insertUser)


user_Route.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}));

// Callback route after Google OAuth
user_Route.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login' // Redirect to login on failure
    }),
    (req, res) => {
        req.session.user_id = req.user._id; // Store user ID in session
        res.redirect('/');
    }
);


// Route to fetch the user's phone number after authentication
//     user_Route.get('/user/phone-numbers', async (req, res) => {
//     try {
//         // Ensure the user is authenticated
//         if (!req.session.user_id) {
//             return res.redirect('/login');
//         }
//         // Use the access token to make the API request
//         const accessToken = req.session.access_token; // Ensure you have the token stored in the session
//         const response = await axios.get('https://people.googleapis.com/v1/people/me?personFields=phoneNumbers', {
//             headers: {
//                 Authorization: `Bearer ${accessToken}`
//             }
//         });
//         console.log(response.data);
//         // Send the phone numbers as a response
//         res.json(response.data);
//     } catch (error) {
//         console.error('Error fetching phone numbers:', error);
//         res.status(500).send('An error occurred while fetching phone numbers.');
//     }
// });

//Login & forgotPassword
user_Route.get('/login', userAuth.isLogout , userControllers.loadLogin)

user_Route.post('/login',userControllers.verifyLogin)  // next time try to do with ajax

// user_Route.route('/login')
//   .get(userAuth.isLogout, userControllers.loadLogin)
//   .post(userControllers.verifyLogin);

user_Route.get('/forgetPassword', userAuth.isLogout , userControllers.forgotPasswordPage)
user_Route.post('/passwordOtp',userAuth.isLogout,userControllers.verifyPasswordOtp)
user_Route.patch('/resetPassword',userAuth.isLogout ,userControllers.newPassword)


//Surf...
user_Route.get('/', userControllers.landingPage)
user_Route.get('/shop', userControllers.Productspage)
user_Route.get('/productDetails', userControllers.productDetails)

//WishList
user_Route.get('/wishList',userAuth.isLogin,userControllers.productWishListPage)
user_Route.post('/wishlist/toggle',userAuth.isLogin,userControllers.addRemoveWishList)
user_Route.get('/wishlist/check/',userAuth.isLogin, userControllers.wishListStatusUpdate)

//Cart
user_Route.get('/cart', userControllers.cartPage)
user_Route.post('/cart/add-to-cart', userControllers.addToCart)
user_Route.patch('/cart/update-quantity',userAuth.isLogin, userControllers.updateQuantity)
user_Route.delete('/cart/delete-item',userAuth.isLogin, userControllers.removeproduct)

//Account
user_Route.get('/personalInfo', userAuth.isLogin , userControllers.userDashboard)
user_Route.get('/editProfile' , userAuth.isLogin , userControllers.editProfilePage)
user_Route.patch('/updateProfileName' ,userAuth.isLogin, userControllers.updateProfileName)
user_Route.patch('/updateM&M' ,userAuth.isLogin, userControllers.updateMail_Mobile)
user_Route.get('/changePassword' , userAuth.isLogin , userControllers.updatePasswordpage)
user_Route.patch('/changePassword' , userAuth.isLogin, userControllers.updatePassword)

//Address
user_Route.get('/address' , userAuth.isLogin , userControllers.addressPage)
user_Route.get('/address/add' , userAuth.isLogin , userControllers.addAddressPage)
user_Route.post('/address/add' , userAuth.isLogin, userControllers.addAddress)
user_Route.get('/address/edit/:id' , userAuth.isLogin , userControllers.editAddressPAge)
user_Route.patch('/address/update/:id' ,userAuth.isLogin,  userControllers.updateAddress)  
user_Route.delete('/address/delete/:id' ,userAuth.isLogin,  userControllers.deleteAddress)
user_Route.patch('/address/default/:id' ,userAuth.isLogin,  userControllers.defaultAddress)

// Order
user_Route.get('/order/history' , userAuth.isLogin , userControllers.orderHistory)
user_Route.patch('/order/cancel' ,userAuth.isLogin, userControllers.orderCancellation)
user_Route.patch('/order/return' ,userAuth.isLogin,  userControllers.orderReturn)


//Wallet 
user_Route.get('/user/wallet' , userAuth.isLogin , userControllers.userWalletPage)
user_Route.post('/wallet/addMoney' , userAuth.isLogin , userControllers.addMoney)
user_Route.post('/walletPayment/verify', userAuth.isLogin ,userControllers.verifyWalletPayment)
user_Route.post('/walletpayment/verify/failed', userAuth.isLogin ,userControllers.verifyWalletPaymentFailed)

//Payment  
user_Route.get('/checkout',userAuth.isLogin, userControllers.confirmOrderPage)
user_Route.post('/address/addAddress',userAuth.isLogin, userControllers.addAddressFromCheckout)
user_Route.post('/address/editAddress',userAuth.isLogin, userControllers.editAddressFromCheckout)
user_Route.post('/checkout',userAuth.isLogin,  userControllers.confirmOrder)
user_Route.post('/payment/failed', userAuth.isLogin, userControllers.paymentFailed)
user_Route.post('/payment/verify', userAuth.isLogin, userControllers.verifyPayment)

//Coupon
user_Route.post('/couponvalidation',userAuth.isLogin,userControllers.validateCoupon)



//logout
user_Route.get('/logout' , userAuth.isLogin , userControllers.userLogout)

//others
user_Route.get('/error',userControllers.errorpage)
// user_Route.get('*',userControllers.page404)




module.exports=user_Route 
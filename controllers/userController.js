
const User = require('../model/userModel');
const Otp = require('../model/otp') 



const bcrypt = require('bcrypt');

const nodeMailer = require('../helpers/mailer');
const {twoMinuteExpiry} = require('../helpers/otpValidate');
const {securePassword ,generateRandom4Digit} = require('../helpers/utility')

/************************************************************************************************************************************ */
// Signup page
const loadSignup = async(req,res)=>{
    try {
        res.render('signupPage')
    } catch (error) {
        console.log(error.message);
         return res.status(500).redirect('/error')
    }
}
/************************************************************************************************ */

//send Mail( of otp) & storing Otp in db
const sendMailOtp = async (req, res) => {

    try {
        const existingEmail = await User.find({email:req.body.email})  //these will return a value ( [] ) so it will be true      
        // console.log(existingEmail); 
        
        if (existingEmail.length > 0) {       //thts y i used existingEmail.length > 0    
            return res.status(400).json({
            success:false,
            msg:"Email already exists. Please use a different email."
            })  
        }

        const g_otp=await generateRandom4Digit()  //g_otp => generate-otp

        const oldOtpData = await Otp.findOne({user_id : req.body.email})
        console.log(oldOtpData);
        

        if(oldOtpData){
            const sendNextOtp = await twoMinuteExpiry(oldOtpData.timestamp) //recent otp time of that user
                // console.log(sendNextOtp) 
                // console.log(!sendNextOtp) 
            if(!sendNextOtp){ 
                  console.log("expire time not exided");
                    return res.status(400).json({
                    success:false,
                    msg:"An Otp already has been send to your mail"
                })  
            }else{
                console.log("expiry time exided");
                res.status(200).json({ 
                success:true,       
                msg:"An OTP has been sent to your email" 
                })
            }  
        }
        const cDAte = new Date() //cDAte => current-Date

        const otpData = await Otp.findOneAndUpdate( //this is used for updating the otp  form the document which  has same email 
            {user_id : req.body.email},
            {otp     : g_otp , timestamp : new Date(cDAte.getTime())},
            {upsert  : true , new : true , setDefaultsOnInsert : true }
            /* upsert works same as update jst add-on feature is that if that perticular field is not 
            available then it will create one document  cz of  this (line no 49th code(upsert:......)) code
            i dont need write a code to insertOne document  and (for adding (saving )new document ) 
            which i have commented from line number 57 to 61(insertOne code)*/
        )
        console.log(otpData);
        
        // const enter_otp = new Otp({  //this work as insertOne  
        //     user_id:req.body.email,
        //     otp    : g_otp,
        // })
        //await enter_otp.save()

        const Useremail = req.body.email; //can i move this to the line after 42 and use Useremail insted of req.body.email ?
        const subject = 'OTP VERIFICATION..!';
        const msgToUser = `<p>Use OTP:-<h3>${g_otp},</h3><br>To verifiying your Mail ,<br> DO-Not Share this code with anyone</p>`;

        nodeMailer.sendMaiL(Useremail, subject, msgToUser);
        console.log('email sent successfully');
        res.status(200).json({ 
            success:true,     
            msg:"An OTP has been sent to your email" 
            })
    
    } catch (error) {

        console.log('Failed to send  email', error.message);
        return res.status(500).redirect('/error')
    }
};
/********************************************************************************************************************** */

//verify-Otp for mail verification 
const verifyOtp= async (req,res) => {
    try {

        const email = req.body.email
        const otp = req.body.otp

        const otpData = await Otp.findOne({user_id : email})
        
        if(otpData && otpData.otp==otp){
            
            console.log("Otp is Correct");
                res.status(200).json({
                success:true
            })
        }else{
            console.log("Otp is Not Correct");
               return res.status(400).json({
                success:false,
            })
        }
    } catch (error) {
        console.log('Failed to verify otp:-', error.message);
        // return res.status(500).redirect('/error')
        
    }
}
/********************************************************************************************************************* */

//Storing  users in database
const  insertUser = async(req,res)=>{
    try {
        // await Otp.deleteOne({user_id : req.body.email})     //??????????????is this required????????????
       
        const existingMob = await User.findOne({ mobile: req.body.mob });
        if (existingMob) {
            res.render('signupPage', { txt:'Mobile number already exists.Please use a different Number.' });
            return;
        }

        const spassword =await securePassword(req.body.password)
        

        const user=new User({
        firstName : req.body.fname,
        lastName : req.body.lname,
        email : req.body.email,
        mobile : req.body.mob,
        password : spassword, 
        is_verified : true,
        is_admin : 0
        })

        const userData= await user.save()
        console.log(`new User  => ${userData}`);
        console.log(`password = ${req.body.password}`);

        if(userData){
            res.render('signupPage',{message:'Account Creation has been Success-Full,You Can login Now'})
        }else{
            res.render('signupPage',{message:' Sign-Up Failed,Please check with our team-members'})
        }

    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}

/********************************************************************************************************************* */
// login page 
const loadLogin = async(req, res) => {
    try {
        res.render('userLogin');
    } catch (error) {
        console.error('Error in loadLogin:', error.message);
        return res.status(500).redirect('/error');
    }
};
/********************************************************************************************************************* */
//verify login user
const verifyLogin = async(req,res)=>{
    try {
        const useremail = req.body.email
        const password = req.body.password

        // console.log(useremail,password);

        const userData = await User.findOne({isAdmin : false , email:useremail})
        // console.log(userData);

        if(userData){
            if(userData.isBlocked){
                    res.render('userLogin',{message:"Your A/C has been Blocked"})
            }else{
                const passwordMatch =  await bcrypt.compare(password,userData.password)
                if(passwordMatch ){
                    req.session.user_id = userData._id
                    res.redirect('/')
                }else{
                    res.render('userLogin',{message:"Invalid email & Password"})
                }
            }
        }else{
            res.render('userLogin',{message:"Invalid Email & password"})
        }
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}
/****************************************       FORGOT PASSWORD      ********************************************************************/
 const forgotPasswordPage = async(req,res)=>{
    try {
        res.render('forgotPassword')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
 }
/*****************************************     RESET PASSWORD OTP     *****************************************************/
const verifyPasswordOtp = async(req,res)=>{
   try {
        const existingEmail = await User.find({email:req.body.email})  //fimd will return a value  in an array even if it dosent get anu value  still there but the value(  ie [] empty array  ) so it will be true      
        console.log(existingEmail); 
        
        if (existingEmail.length === 0) {  
            return res.status(400).json({
            success:false,
            msg:"Email Not Found"
            })  
        }

        const oldOtpData = await Otp.findOne({user_id : req.body.email})
        console.log(oldOtpData);

        if(oldOtpData){
            const sendNextOtp = await twoMinuteExpiry(oldOtpData.timestamp) //recent otp time of that user 
            if(!sendNextOtp){ 
                  console.log("expire time not exided");
                   return res.status(200).json({
                    success:false,
                    msg:"An Otp already has been send to your mail Or try after 1-mint",
                    color :'#dc3545'
                })  
                
            }
        }

        const g_otp=await generateRandom4Digit()  //g_otp => generate-otp
        
    
        const cDAte = new Date() //cDAte => current-Date

        const otpData = await Otp.findOneAndUpdate( //this is used for updating the otp  form the document which  has same email 
            {user_id : req.body.email},
            {otp     : g_otp , timestamp : new Date(cDAte.getTime())},
            {upsert  : true , new : true , setDefaultsOnInsert : true }
        )
        console.log(otpData);
    
        const Useremail = req.body.email; //can i move this to the line after 42 and use Useremail insted of req.body.email ?
        const subject = 'OTP VERIFICATION..!';
        const msgToUser = `<p>Use OTP:-<h3>${g_otp},</h3><br>To verifiying your Mail ,<br> DO-Not Share this code with anyone</p>`;

        nodeMailer.sendMaiL(Useremail, subject, msgToUser);
        console.log('email sent successfully');
        res.status(200).json({ 
            success:true,     
            msg:"An OTP has been sent to your email" 
            })
    
    } catch (error) {

        console.log('Failed to send  email', error.message);
        return res.status(500).redirect('/error')
    }
}
/*****************************************  VERIFY OTP    *********************************************/
   
   // SAME CODE OF '/verifyOtp' 

/***************************************    RESET PASSWORD       ************************************************/
const newPassword = async(req,res)=>{
    const email = req.body.email
    const password = req.body.password

    const spassword= await securePassword(password)

    const newPasswordData = await User.findOneAndUpdate(
        { email: email },
        { $set: { password: spassword } },
        { new: true } // This will return the updated document
    )
    console.log ('newPasswordData',newPasswordData);
    
    if(newPasswordData){
        res.status(200).json({
        success: true,
        message: " Password has been updated successfully "
        })
    }else{
        return res.status(500).json({
        success:false ,
        message : "!! Password Updation failed ,Plz try again !!"
        })
    }
}
const userLogout = async(req,res)=>{
    try {
        req.session.destroy()
        res.redirect('/')  
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************************************************************************************* */
const errorpage = async(req,res)=>{
    res.render('errorCatch')
}
/********************************************************************************************************************* */

const page404 = async(req,res)=>{
    res.render('pageNotFound')
}
/********************************************************************************************************************* */


module.exports={

    loadSignup,
        sendMailOtp,
        verifyOtp,
        insertUser,

    loadLogin,
        verifyLogin,
        forgotPasswordPage,
            verifyPasswordOtp,
            newPassword,

    userLogout,

    errorpage,page404,

}
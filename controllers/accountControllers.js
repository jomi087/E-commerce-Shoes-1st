
const User = require('../model/userModel');

const bcrypt = require('bcrypt');
const {securePassword} = require('../helpers/utility')

/*******************************************    USER DASHBOARD     *************************************************** */
const userDashboard = async (req,res)=>{
    try {
        const userData = await User.findOne({_id : req.session.user_id})
        if(!userData){
            console.log('userData notfound (from :- userDashboard)');
            return res.status(500).render('errorCatch',{error : " !! Network Issue "})
        }
        res.render('userDashboard',{userData})
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error')
    }
}
/********************************************     EDIT PROFILE PAGE    ******************************************************************** */
const editProfilePage = async(req,res)=>{
    try {
        const userData = await User.findOne({_id : req.session.user_id})
        
        if(!userData){
            console.error('userData notfound (from :- updateProfile)');
            return res.status(500).render('errorCatch',{error : " !! plz Login again "})
        }
        res.render('editProfile',{user:userData})
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/********************************************      UPDATE PROFILE NAME     *************************************************************************/
const updateProfileName =async(req,res)=>{
    try {
        const user = await User.findOne({_id : req.session.user_id})

        if (user.length > 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if(user.firstName === req.body.fname && user.lastName === req.body.lname ){
            return res.status(400).json({
                   success:false,
                   message : 'Previous feild and Current Feild Cant be the same !!'
            })
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.session.user_id, 
            {
                firstName: req.body.fname, 
                lastName: req.body.lname
            },
            { new: true }  // returns the updated document
        );
            
        // console.log( "this ",updatedUser);

        if(!updatedUser){
            return res.status(404).json({
                success:false,
                message : 'Updating Failed , You have been Loged out '
            })
        }else{
            res.status(200).json({
                success: true,
                message: 'Profile name has been Updated'
            });
        }
        
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*********************************************************************************************************************/
const updateMail_Mobile = async(req,res)=>{
    try {

        const user = await User.findOne({_id : req.session.user_id})

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updateduseremail = req.body.email

        const existingEmail = await User.find({email:updateduseremail})   
        
        if (existingEmail.length > 0) {       
            return res.status(400).json({
            success:false,
            message:"Email already exists. Please use a different email."
            })  
        }

        const updatedusermobile = req.body.mobile
        const password = req.body.password
        
        const passwordMatch = await bcrypt.compare(password,user.password)
        if(passwordMatch){
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    email : updateduseremail,
                     mobile : updatedusermobile
                },
                    { new: true }
            )
            // console.log(updatedUser);
            
            if(updatedUser){
                res.status(200).json({
                    success:true,
                })
            }else{
                res.status(400).json({
                    success:false,
                    message : "Updation Failed"
                })
            }
        }else{
            res.status(401).json({
                success:false,
                message : " Password is  In-correct"
            })
        }

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/*****************************************************************************************************************/
const updatePasswordpage = async (req,res)=>{
    try {
        res.render('changePasswordPage')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')   
    }
}
/*********************************************************************************************************************/
const updatePassword = async (req,res)=> {
    try {
        const user = await User.findOne({_id : req.session.user_id })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const password = req.body.cPassword
        const newPassword = req.body.nPassword

        console.log(newPassword);
        

        const passwordMatch = await bcrypt.compare(password,user.password)
        if(!passwordMatch){
            return res.status(401).json({
                success: false,
                message: "InCorrect Password"
            })
        }

        if(password===newPassword){
            return res.status(400).json({
                success: false,
                message: "Current Password & New Password canot be the same"
            })
        }
        
        const spassword = await securePassword(newPassword)

        const updatePassword = await User.findByIdAndUpdate(user._id,{password : spassword},{new : true})
        if(updatePassword){
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
    } catch (error) {
         console.log(error.message);
         return res.status(500).redirect('/error')
    }
}

module.exports={
    userDashboard,
        editProfilePage,
            updateProfileName,updateMail_Mobile,
            updatePasswordpage,updatePassword,
}

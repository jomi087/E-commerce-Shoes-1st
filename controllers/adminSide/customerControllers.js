const User = require("../../model/userModel")

/***********************************    usersDetails     ******************************************/
const  usersDetails = async (req,res)=>{
    try {

        if(req.query.search){                                                    //search input
            const searchUser =RegExp(req.query.search,'i')
            console.log(searchUser);
                const searchUserData = await User.find({firstName:searchUser,isAdmin : false,})
                res.render('userInfo',{
                    users:searchUserData ,
                    searchTerm: req.query.search 
                 })
        }else{
            const usersData = await User.find({isAdmin : false})                  //all info login  users
            res.render('userInfo',{users : usersData, searchTerm : '' }) 
        }   
        
    }catch (error) {      
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/***********************************   userBlocked  & unblocked   ******************************************/

const userStatus = async (req, res) => {
    try {
      const id = req.query.id;
      const user = await User.findById(id); // Retrieve the user document
  
    if (!user) {
        return res.status(404).render('errorCatch',{error : "User not Found"})
    }

    await User.updateOne({ _id: id },{ $set: { isBlocked: !user.isBlocked } } )

    res.redirect("/admin/customer")

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error') ;   
    }
};

module.exports = {
    usersDetails,
    userStatus
}
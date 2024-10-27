const User = require('../../model/userModel');
const Address = require("../../model/addressModel")

/**********************************             ADDRESS PAGE             ******************************************** */
const addressPage = async(req, res) => {
    try {
        const userId = req.session.user_id; 

        
        const user = await User.findById(userId).populate('addresses'); // Finding the user by ID to get aray of addresses 

        if (!user) {
            return res.status(404).redirect('/login');
        }

        const addressData = user.addresses; //  to get the addresses i have used populate(on top) or else only adressess _id would be  given
        // console.log(addressData);
        
        res.render('userAddress', { address: addressData });
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};
/***********************************           ADD ADDRESS PAGE          ************************************************* */
const addAddressPage = async (req,res)=>{
    try {
        res.render('addAddress')
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/***********************************             ADD ADDRESS            **********************************************/
const addAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).render('addAddress', {
                message: {
                    type: 'error',
                    text: 'You have been logged out. Please log in again.'
                }
            });
        }

        const address = new Address({
            name: req.body.name,
            phone: req.body.mobile,
            pincode: req.body.pincode,
            locality: req.body.locality,
            district: req.body.district,
            state: req.body.state,
            address: req.body.address,
        });

        const addressData = await address.save();

        if (!addressData) {
            return res.status(500).render('addAddress', {
                message: {
                    type: 'error',
                    text: 'Adding Address failed, Try again..'
                }
            });
        }

        // Add the address to the specific user's address array
        user.addresses.push(addressData._id);
        await user.save();

        res.status(201).render('addAddress', {
            message: {
                type: 'success',
                text: 'Address added Successfully'
            }
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};
/***********************************           EDIT ADDRESS PAGE          **********************************************/
const editAddressPAge = async(req,res)=>{
    try {
        const specificAddress = await Address.findById(req.params.id)

        if(!specificAddress){
            console.log(" cannot found specificAddress (from UserAddressPAge  to editAddressPage )");
            return res.status(404).send('Address not found')
        }

        res.render('editAddress',{address : specificAddress })

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')  
    }
}
/**********************************              EDIT ADDRESS             ********************************************** */
const updateAddress = async (req,res)=>{
    try {
        const address = await Address.findOne({_id : req.params.id})
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Updation Failed Address Not Found"
            });
        }
        // console.log(address);
       
        const updateAddress = await Address.findByIdAndUpdate( req.params.id, {
                name : req.body.name,
                phone : req.body.mobile,
                pincode : req.body.pincode,
                locality : req.body.locality,
                district : req.body.city,
                state : req.body.state,
                address : req.body.address,
            },
                {new : true}
        )
        
        if(!updateAddress){
            return res.status(404).json({
                success: false,
                message: "Updating Failed , You have been Loged out"
            });
        }
            res.status(200).json({
                success: true,
                message: 'Address has been Updated Successfully'
            });
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error')
    }
}
/**********************************            DEFAULT ADDRESS             ********************************************/
const defaultAddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const userId = req.session.user_id;

        const user = await User.findById(userId).populate('addresses')

        if(!user){
            return res.status(404).json({
                success: false,
                message: "user Not Found"
            });
        }

        const address = user.addresses.find(address => address._id.toString() === addressId )

        if(!address){
            return res.status(404).json({
                success : false , 
                message : "Address Not Found"
            })
        }

        await Address.updateMany({_id : { $in : user.addresses}},{ $set : {isDefault : false}})
        await Address.findByIdAndUpdate(addressId , {$set : {isDefault : true }})
        
        return res.status(204).end();      //204 -> No Content  ->means successful request, no data returned

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}
/**********************************             DELETE ADDRESS            *******************************************/
const deleteAddress = async(req,res)=>{
    try {
        await Address.findByIdAndDelete(req.params.id)
        await User.findOneAndUpdate({addresses : req.params.id },{$pull:{addresses:req.params.id}})
        res.status(200).json({
            success : true,
            message : 'Deletion Succesfull'
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}

module.exports={
    addressPage,
        addAddressPage,addAddress,
        editAddressPAge,updateAddress,
        deleteAddress,
        defaultAddress,
}

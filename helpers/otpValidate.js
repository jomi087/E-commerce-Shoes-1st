
/* Send Otp time gyap :-  once you have send otp then after 2 minuts later only u can send next otp that 2 minuts logic is achived by this code                                                         */

const twoMinuteExpiry = async (recentOtpTime)=>{   //curently i have set it for 1 mint
    try {

        const currentDate = new Date(); 
                            
        let timeDifferenceValue =(recentOtpTime - currentDate.getTime())/1000


        timeDifferenceValue = timeDifferenceValue/60; //again converted it into minutes

        if(Math.abs(timeDifferenceValue) > 1){
            return true ;  
        }
            return false;  
        
    } catch (error) {
        console.log(error.message);
    }
}

module.exports  = {
    twoMinuteExpiry
}

/* Send Otp time gyap :-  once you have send otp then after 2 minuts later only u can send next otp that 2 minuts logic is achived by this code                                                         */

const twoMinuteExpiry = async (recentOtpTime)=>{   //curently i have set it for 1 mint
    try {
                            // console.log(`Recent otp get timestamp = ${recentOtpTime}`);

        const currentDate = new Date(); 
                            // console.log(`Current otp get timestamp = ${currentDate.getTime()}`);  
                            
        let timeDifferenceValue =(recentOtpTime - currentDate.getTime())/1000

                            // console.log(`time difference  in timestamp (old-current = result )=> ${recentOtpTime - currentDate.getTime()}`)
                            // console.log(`converting in to seconds (result / 1000 = seconds )=> ${timeDifferenceValue}`)

        timeDifferenceValue = timeDifferenceValue/60; //again converted it into minutes
                            console.log(`converting in to Minutes (seconds / 60 = minutes )=> ${Math.abs(timeDifferenceValue)}`)

        if(Math.abs(timeDifferenceValue) > 1){
            console.log('time difference greater than 1 minut')
            return true ;  
        }
            console.log('time difference less than 1  minut');
            return false;  
        
    } catch (error) {
        console.log(error.message);
    }
}

module.exports  = {
    twoMinuteExpiry
}
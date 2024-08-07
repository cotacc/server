const ErrorRespond = require('../utils/errorResponds')
const errorhandle = (err,req,res,next)=>{
   let error = {...err};
   error.message = err.message;

   //USERID NOT FOUND
   if(err.name==="CastError")
   {
      const message = "Userid not found";
      error = new ErrorRespond(message,400);
   }

   //EMAIL EXISTING
   if(err.code ===11000)
   {
      const message = "Email is already exists!";
      error = new ErrorRespond(message,400);
   }

   //EMAIL, NAME AND PASSWORD REQUIRE
   if(err.name === "ValidationError"){
      const message = Object.values(err.errors).map(value => value.message);
      error = new ErrorRespond(message,400);
   }

   res.status(error.status || 500).json({success:false,error:error.message});
}


module.exports = errorhandle;
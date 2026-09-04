import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asynchandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";


export const verifyJWT = asyncHandler(async(req, res,next)=>{
   try {
    const token=  req.cookies?.access || req.header("Authorization")?.replace("Bearer", "")
 
    if(!token){
     throw new ApiError(401 , "Unauthoriized token")
    }
 
    const decodetoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET )
 
    const user = await User.findById(decodetoken?._id).select("-password -refreshToken")
 
    if(!user)
     {
         // next_video: discuss about frontend
         throw new ApiError(401 , "Invalid Access Token")
     }
     req.user = user;
     next()
   } catch (error) {   
         throw new ApiError(401, error?.message || "Invalid Access Token")
   }

    
})
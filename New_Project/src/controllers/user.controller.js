import {asyncHandler} from '../utils/asynchandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const registerUser = asyncHandler(async (req,res)=>{
    res.status(200).json({
        message:"hii i am vaibhav kumar founder and ceo of blocksex"
    })
    // get user details from frontend 
    // validation - not empty 
    // check if user already exits: username , email
    // check for image , avatar 
    // upload then to cloudnary, avatar
    // create user object - create entry in db 
    // send response back to frontend
    // send token back to frontend
    // remove password and refresh token feild from response 
    // check user creation
    // return res

    const {fullname , email, username , password} = req.body
    console.log("email:", email);
    if (
        [fullname, email, username , password].some((feild) => feild?.trim() === "")
    ) {
        throw new Error(400,"All feild are requird");
        
    }

    const existedUser = await User.findOne({
        $or:[{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path 
    //const coverlocalPath = req.files?.coverImage[0]?.path
    let coverlocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverlocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const cover = await uploadOnCloudinary(coverlocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar upload failed");
    }


    const user = await User.create({
        fullname,
        avatar:avatar.url,
        cover:cover?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken "
    )

    if(!createduser){
        throw new ApiError(404, "User not found");
    }
    return res.status(201).json(
        new ApiResponse(200, createduser,"user registered successfully ")
    );


}) 

const generateaccessandrefershtoken = async(userID)=>{
        try{
            const user = await User.findById(userID)
            const access = user.generateAccessToken()
            const refersh = user.generateRefreshToken()

            user.refersh = refersh
            await user.save({validateBeforeSave: false })

            return{access, refersh} 



        } catch(error){
            throw new ApiError(500, "something went wrong while generating refersh and access token")
        }
        
    }

const loginuser= asyncHandler(async(req,res)=>{
    const {email,username, password} = req.body // req body -> data , username or email , find the user , password chaeck  , access and referesh token 
    if(!username || !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exit")
    }

    const ispasswordvalid = await user.isPasswordCorrect(password)

    if(!ispasswordvalid){
        throw new ApiError(401,"invalid password")
    }

    
    const {access , refersh} = await generateaccessandrefershtoken(user._id)

    const loggeduser= await  User.findById(user._id).select("-password -refersh ")

    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("access",access, options)
    .cookie("refersh",refersh,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggeduser , access,
                refersh
            },
            "user logged in successfully"
        )
    )

    


})

const logoutuser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id ,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("access", options)
    .clearCookie("refersh" , options)
    .json(new ApiResponse(200, {}, "user logged out successfully"))


})

const refershAccessToken = asyncHandler(async(req,res)=>{
    const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingrefreshToken){
        throw new ApiError(401, " unauthorized token")
    }

    try {
        const decodetoken = jwt.verify(
            incomingrefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodetoken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
    
        if(incomingrefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401, "refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {access, newrefersh} = await generateaccessandrefershtoken(user._id)
    
        return res
        .status(200)
        .cookie("access", access, options)
        .cookie("refersh", newrefersh, options)
        .json(new ApiResponse(200, {access , refersh: newrefersh }, "access token generated successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")    
    }


})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

    


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "old password is incorrect")
    }
    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async(req , res)=>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfull")
})

const updateAccountDetails = asyncHandler(async(req , res)=>{
    const {fullname , email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "fullname and email are required")
    }
    const user = await User.findById(req.user?._id, {$set:{fullname,
        email:email
    }}, {new: true}).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "account details updated successfully")
    ) 
})

const updateUserAvater = asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, " Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar updated successfully")
    )
})


const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover image file is required")
    }

    const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, " Error while uploading on cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new: true}
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover image updated successfully")
    )
})

const getuserchannelprofile= asyncHandler(async(req, res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username:username?.toLowerCase()
            }
        },
        /* {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"userId",
                as:"subscriber"
            }
        }, */
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"channel",
                as:"subscriber"
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exits")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
})

const getwatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
            _id: mongoose.Types.objectId(req.user._id)
           }

        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user[0].watchHistory,
            "watch history fetched istory"
        )
    )
})



export {
    registerUser,
    loginuser,
    logoutuser,
    refershAccessToken,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvater,
    updateUserCoverImage,
    getUserDetails,
    getWatchHistory
}
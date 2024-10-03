import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js" 
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, username, password } = req.body
   
    if (
        [fullName,email,username,password].some((field)=>
        field?.trim()==="")
    ) {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=User.findOne({
        $or:[{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createddUser=await User.findByID(user._id).select(
        "-password -refreshTokenn"
    )

    if(!createddUser){
        throw new ApiError(500,"Something went Wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createddUser,"User Registered Successfully!!!")
    )

})

export { registerUser };    

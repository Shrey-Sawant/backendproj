import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessAndREfreshTokens = async (userId,) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefershToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, userName, password } = req.body

    if (
        [fullName, email, userName, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // console.log(req.files?.avatar[0]?.path);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, " Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    console.log(avatar);
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createddUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createddUser) {
        throw new ApiError(500, "Something went Wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createddUser, "User Registered Successfully!!!")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;

    if (!(userName || email)) {
        throw new ApiError(400, "Username and Email is required");
    }

    const user = User.findOne({
        $or: [{ userName }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not Exits")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndREfreshTokens(user._id);

    const loggedInUser = awaitUser.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken,
                    refreshToken
                },
                "User Logged In Successfully")
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Loggedout Successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unaouthorized request");
        }
    
        const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
        if(incomingRefreshToken!=user?.refreshToken){
            throw new ApiError("Refresh TOken is expired or used");
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} =await generateAccessAndREfreshTokens(user._id);
    
        return res
               .status(200)
               .cookie("accessToken",accessToken,options)
               .cookie("refreshToken",newRefreshToken,options)
               .json(
                new ApiResponse(
                    200,
                    {accessToken,refreshToken:newRefreshToken,},
                    "Access Token Refreshed"
                )
               )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refersh Token")
    }
})
export { registerUser, loginUser, logoutUser,refreshAccessToken };

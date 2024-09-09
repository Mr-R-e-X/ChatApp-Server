import jwt from "jsonwebtoken";
import { User } from "../models/user.schema.js";
import ApiError from "../utils/apiError.js";
import AsyncHandler from "../utils/asyncHandler.js";

const authenticateToken = AsyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Access Denied. No token provided.");
  }
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if (!decodedToken) throw new ApiError(401, "Invalid token!");
  const user = await User.findById(decodedToken?._id).select(
    "-refreshToken -createdAt -updatedAt -__v"
  );
  if (!user) throw new ApiError(401, "Unauthorized Request!");
  req.user = user;
  next();
});

export default authenticateToken;

  
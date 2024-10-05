import jwt from "jsonwebtoken";
import { User } from "../models/user.schema.js";
import ApiError from "../utils/apiError.js";
import AsyncHandler from "../utils/asyncHandler.js";
import { getUserIpAddress } from "../utils/getUserIp.js";
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
    "-refreshToken -updatedAt -__v"
  );
  if (!user) throw new ApiError(401, "Unauthorized Request!");
  req.user = user;
  next();
});

export const authenticateAdminToken = AsyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.adminToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Access Denied. No token provided.");
  }
  const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  if (!decodedToken) throw new ApiError(401, "Invalid token!");
  next();
});

export const checkAdminAccess = (req, res, next) => {
  const adminAccessibleIp = getUserIpAddress();
  const isAccessIp = adminAccessibleIp === process.env.ADMIN_ACCESS_IP;

  if (!isAccessIp) {
    return next(new ApiError(401, "This IP route address is unauthorized!"));
  }

  next();
};

export const socketAuthenticator = AsyncHandler(async (err, socket, next) => {
  try {
    if (err) return next(err);
    const token = socket.request.cookies["accessToken"];
    if (!token) throw new ApiError(401, "Please login first");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken) throw new ApiError(401, "Invalid token");
    const user = await User.findById(decodedToken._id).select(
      "-refreshToken -updatedAt -__v"
    );
    if (!user) throw new ApiError(401, "Unauthorized request");
    socket.user = user;
    return next();
  } catch (error) {
    console.log(error);
    next(new ApiError(401, "Please login to access the route"));
  }
});

export default authenticateToken;

import ApiError from "./apiError.js";

export const generateJwtTokens = async (model, id) => {
  try {
    const db = await model.findById(id);
    const accessToken = await db.generateAccessToken();
    const refreshToken = await db.generateRefreshToken();
    db.refreshToken = refreshToken;
    await db.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      error.message ||
        "Something went wrong while generating access token and refresh token"
    );
  }
};

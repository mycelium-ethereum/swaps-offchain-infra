import { getUserProfile, modifyUserProfile } from "../controllers/User.controller";
import asyncHandler from "../utils/AsyncHandler";
import { authenticatedGuard } from "../middleware/Siwe.middleware";
const userRoute = require("express").Router();

userRoute.get("/profile", authenticatedGuard, asyncHandler(getUserProfile));
userRoute.patch("/profile", authenticatedGuard, asyncHandler(modifyUserProfile));
export default userRoute;

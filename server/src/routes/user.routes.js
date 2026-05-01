import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models.js";

export const userRouter = express.Router();

userRouter.get("/", requireAuth, async (req, res) => {
  const users = await User.find()
    .select("name email role")
    .sort({ name: 1 });

  res.json(users);
});

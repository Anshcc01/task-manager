import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Project, Task } from "../models.js";

export const dashboardRouter = express.Router();

dashboardRouter.get("/", requireAuth, async (req, res) => {
  let projectQuery = {};
  let taskQuery = {};

  if (req.user.role !== "ADMIN") {
    const projects = await Project.find({ "memberships.user": req.user._id }).select("_id");
    const projectIds = projects.map((project) => project._id);
    projectQuery = { _id: { $in: projectIds } };
    taskQuery = { project: { $in: projectIds }, assignee: req.user._id };
  }

  const now = new Date();
  const [projects, totalTasks, todo, inProgress, done, overdue, myTasks] =
    await Promise.all([
      Project.countDocuments(projectQuery),
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: "TODO" }),
      Task.countDocuments({ ...taskQuery, status: "IN_PROGRESS" }),
      Task.countDocuments({ ...taskQuery, status: "DONE" }),
      Task.countDocuments({
        ...taskQuery,
        status: { $ne: "DONE" },
        dueDate: { $lt: now }
      }),
      Task.find({ ...taskQuery, assignee: req.user._id })
        .populate("project", "name")
        .sort({ dueDate: 1, updatedAt: -1 })
        .limit(8)
    ]);

  res.json({
    projects,
    totalTasks,
    status: { todo, inProgress, done },
    overdue,
    myTasks
  });
});

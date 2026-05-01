import express from "express";
import { z } from "zod";
import { requireAuth, requireProjectAccess, requireProjectAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Project, Task, toId } from "../models.js";

export const projectRouter = express.Router();

const projectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable()
});

const memberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

function requireAppAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can create projects" });
  }

  next();
}

async function shapeProject(project, user) {
  const taskQuery =
    user.role === "ADMIN"
      ? { project: project._id }
      : { project: project._id, assignee: user._id };
  const taskCount = await Task.countDocuments(taskQuery);

  return {
    ...project.toObject(),
    id: project._id.toString(),
    _count: { tasks: taskCount }
  };
}

projectRouter.get("/", requireAuth, async (req, res) => {
  const query =
    req.user.role === "ADMIN"
      ? {}
      : { "memberships.user": req.user._id };

  const projects = await Project.find(query)
    .populate("owner", "name email")
    .populate("memberships.user", "name email")
    .sort({ updatedAt: -1 });

  res.json(await Promise.all(projects.map((project) => shapeProject(project, req.user))));
});

projectRouter.post("/", requireAuth, requireAppAdmin, validate(projectSchema), async (req, res) => {
  const project = await Project.create({
    name: req.body.name,
    description: req.body.description || "",
    owner: req.user._id,
    memberships: [{ user: req.user._id, role: "ADMIN" }]
  });

  await project.populate("memberships.user", "name email");
  res.status(201).json(project);
});

projectRouter.get("/:projectId", requireAuth, requireProjectAccess, async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate("memberships.user", "name email")
    .populate("owner", "name email");

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const taskQuery =
    req.user.role === "ADMIN"
      ? { project: project._id }
      : { project: project._id, assignee: req.user._id };

  const tasks = await Task.find(taskQuery)
    .populate("assignee", "name email")
    .populate("createdBy", "name email")
    .sort({ status: 1, dueDate: 1 });

  res.json({
    ...project.toObject(),
    id: project._id.toString(),
    tasks
  });
});

projectRouter.put(
  "/:projectId",
  requireAuth,
  requireProjectAccess,
  requireProjectAdmin,
  validate(projectSchema),
  async (req, res) => {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { name: req.body.name, description: req.body.description || "" },
      { new: true }
    );

    res.json(project);
  }
);

projectRouter.post(
  "/:projectId/members",
  requireAuth,
  requireProjectAccess,
  requireProjectAdmin,
  validate(memberSchema),
  async (req, res) => {
    const project = await Project.findById(req.params.projectId);
    const existing = project.memberships.find((item) => toId(item.user) === req.body.userId);

    if (existing) {
      existing.role = req.body.role;
    } else {
      project.memberships.push({ user: req.body.userId, role: req.body.role });
    }

    await project.save();
    await project.populate("memberships.user", "name email");

    res.status(201).json(project.memberships.at(-1));
  }
);

projectRouter.delete(
  "/:projectId/members/:userId",
  requireAuth,
  requireProjectAccess,
  requireProjectAdmin,
  async (req, res) => {
    if (req.params.userId === toId(req.user._id)) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const project = await Project.findById(req.params.projectId);
    project.memberships = project.memberships.filter(
      (item) => toId(item.user) !== req.params.userId
    );
    await project.save();

    await Task.updateMany(
      { project: project._id, assignee: req.params.userId },
      { $set: { assignee: null } }
    );

    res.status(204).send();
  }
);

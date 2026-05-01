import express from "express";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Project, Task, toId } from "../models.js";

export const taskRouter = express.Router();

const taskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().min(1),
  assigneeId: z.string().optional().nullable()
});

const statusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"])
});

function requireAppAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can create and manage tasks" });
  }

  next();
}

async function ensureAssigneeIsMember(projectId, assigneeId) {
  if (!assigneeId) return true;
  const project = await Project.findById(projectId);
  return project?.memberships.some((item) => toId(item.user) === assigneeId);
}

taskRouter.get("/", requireAuth, async (req, res) => {
  const tasks = await Task.find(
    req.user.role === "ADMIN" ? {} : { assignee: req.user._id }
  )
    .populate("project", "name")
    .populate("assignee", "name email")
    .sort({ dueDate: 1, updatedAt: -1 });

  res.json(tasks);
});

taskRouter.post(
  "/",
  requireAuth,
  requireAppAdmin,
  validate(taskSchema),
  requireProjectAccess,
  async (req, res) => {
    if (!(await ensureAssigneeIsMember(req.body.projectId, req.body.assigneeId))) {
      return res.status(400).json({ message: "Assignee must be a project member" });
    }

    const task = await Task.create({
      title: req.body.title,
      description: req.body.description || "",
      status: req.body.status,
      priority: req.body.priority,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      project: req.body.projectId,
      assignee: req.body.assigneeId || null,
      createdBy: req.user._id
    });

    await task.populate("assignee", "name email");
    await task.populate("project", "name");
    res.status(201).json(task);
  }
);

taskRouter.put(
  "/:taskId",
  requireAuth,
  requireAppAdmin,
  async (req, res, next) => {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    req.body.projectId = toId(task.project);
    next();
  },
  validate(taskSchema),
  requireProjectAccess,
  async (req, res) => {
    if (!(await ensureAssigneeIsMember(req.body.projectId, req.body.assigneeId))) {
      return res.status(400).json({ message: "Assignee must be a project member" });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        title: req.body.title,
        description: req.body.description || "",
        status: req.body.status,
        priority: req.body.priority,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        assignee: req.body.assigneeId || null
      },
      { new: true }
    )
      .populate("assignee", "name email")
      .populate("project", "name");

    res.json(task);
  }
);

taskRouter.patch("/:taskId/status", requireAuth, validate(statusSchema), async (req, res) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const project = await Project.findById(task.project);
  const isProjectMember = project.memberships.some(
    (membership) => toId(membership.user) === toId(req.user._id)
  );
  const isAssignee = toId(task.assignee) === toId(req.user._id);

  if (req.user.role !== "ADMIN" && (!isProjectMember || !isAssignee)) {
    return res.status(403).json({ message: "Only assigned members can update this task" });
  }

  task.status = req.body.status;
  await task.save();
  await task.populate("assignee", "name email");
  await task.populate("project", "name");

  res.json(task);
});

taskRouter.delete("/:taskId", requireAuth, requireAppAdmin, async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  req.body.projectId = toId(task.project);
  next();
}, requireProjectAccess, async (req, res) => {
  await Task.findByIdAndDelete(req.params.taskId);
  res.status(204).send();
});

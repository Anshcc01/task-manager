import jwt from "jsonwebtoken";
import { Project, User, toId } from "../models.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireGlobalAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

export async function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;

  if (!projectId) {
    return res.status(400).json({ message: "projectId is required" });
  }

  if (req.user.role === "ADMIN") {
    req.projectRole = "ADMIN";
    return next();
  }

  const project = await Project.findById(projectId);
  const membership = project?.memberships.find(
    (item) => toId(item.user) === toId(req.user._id)
  );

  if (!membership) {
    return res.status(403).json({ message: "Project access denied" });
  }

  req.projectRole = membership.role;
  next();
}

export function requireProjectAdmin(req, res, next) {
  if (req.user.role !== "ADMIN" && req.projectRole !== "ADMIN") {
    return res.status(403).json({ message: "Project admin access required" });
  }

  next();
}

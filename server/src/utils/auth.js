import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { id: user._id?.toString() || user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function publicUser(user) {
  return {
    id: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

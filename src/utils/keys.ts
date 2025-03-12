import { DEFAULT_USER } from "./env";
import { safeId } from "./feeds";

export const makeKey = (key: string[] | string, user = DEFAULT_USER) => {
  if (typeof key === "string") {
    return `${safeId(user)}:${safeId(key)}`;
  } else if (Array.isArray(key)) {
    return `${safeId(user)}:${key.map(safeId).join(":")}`;
  }
  return `${safeId(user)}`;
};

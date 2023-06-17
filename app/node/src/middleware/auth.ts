import { getSessionBySessionId } from "../routes/session/repository";
import express from "express";

export const checkAuthMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // ログインAPIはチェックしない
  if (req.method === "POST" && req.path === "/api/v1/session") {
    return next();
  }
  try {
		// エラーが発生する可能性があるコード
		// SESSION_IDが存在しない場合、tryブロックに入る
    if (req.cookies?.SESSION_ID === undefined) {
      res.status(401).json({ message: "Unauthorized" });
      console.warn("cookies or session id is empty");
      return;
    }

    const session = await getSessionBySessionId(req.cookies.SESSION_ID);
    if (!session) {
      res.status(401).json({ message: "Unauthorized" });
      console.warn("invalid session id is set");
      return;
    }

    console.log("user has a valid session");
    req.headers["X-DA-USER-ID"] = session.userId;
    next();
  } catch (e) {
		// エラーが発生した時に実行したコードを書く
    next(e);
  }
};

import type { NextFunction, Request, Response, RequestHandler } from "express";

export type AsyncRequestHandler<
  Req extends Request = Request,
  Res extends Response = Response
> = (req: Req, res: Res, next: NextFunction) => Promise<void | Response<any>>;

export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response
>(handler: AsyncRequestHandler<Req, Res>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as Req, res as Res, next)).catch(next);
  };
}

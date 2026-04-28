import express from "express";

export const rawBodyMiddleware = express.raw({
  type: "application/json"
});

export default rawBodyMiddleware;
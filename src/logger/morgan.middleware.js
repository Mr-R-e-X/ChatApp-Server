import morgan from "morgan";
import logger from "./winston.logger.js";

const stream = {
  write: (message) => {
    logger.http(message);
  },
};

const morganMiddleware = morgan(
  ":remote-addr :method :url :status - :response-time ms",
  { stream }
);

export default morganMiddleware;

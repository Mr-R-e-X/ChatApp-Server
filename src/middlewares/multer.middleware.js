import multer from "multer";
import path from "path";

/**
 * Storage configuration for multer to define file destination and filename.
 * @type {multer.StorageEngine}
 */
const storage = multer.diskStorage({
  /**
   * Destination function to specify the folder where files will be saved.
   * @param {Express.Request} req - The request object.
   * @param {Express.Multer.File} file - The file object.
   * @param {function} cb - The callback function to pass the destination path.
   */
  destination: (req, file, cb) => {
    cb(null, path.resolve("public", "temp"));
  },
  /**
   * Filename function to specify the file name with a unique suffix.
   * @param {Express.Request} req - The request object.
   * @param {Express.Multer.File} file - The file object.
   * @param {function} cb - The callback function to pass the filename.
   */
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});
/**
 * Middleware to handle file uploads with multer.
 * @type {multer.Multer}
 */
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
});
/**
 * Middleware function for handling single file uploads with the field name "avatar".
 * @type {multer.Instance}
 */
export const singleAvatar = upload.single("avatar");
export const attachmentMulter = upload.array("files", 5);

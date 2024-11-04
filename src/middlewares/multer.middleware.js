import multer from "multer";

// const storage = multer.diskStorage({

//   destination: (req, file, cb) => {
//     cb(null, path.resolve("public", "temp"));
//   },

//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + "-" + uniqueSuffix);
//   },
// });

const upload = multer({
  limits: { fileSize: 1024 * 1024 * 5 },
});

export const singleAvatar = upload.single("avatar");
export const attachmentMulter = upload.array("files", 5);

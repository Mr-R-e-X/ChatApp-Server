import fs from "fs";

const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "");
};

const removeLocalFiles = (localPath) => {
  fs.unlink(localPath, (err) => {
    if (err) console.log("Error while removing local files: ", err);
    else console.log("Removed local file: ", localPath);
  });
};

const removeUnusedMulterImageFilesOnError = (req) => {
  try {
    const multerFile = req.file;
    const multerFiles = req.files;
    if (multerFile) {
      removeLocalFiles(multerFile.path);
    }
    if (multerFiles) {
      Object.values(multerFiles).forEach((fileObject) => {
        // console.log(fileFieldArray);
        // fileFieldArray.forEach((fileObject) => {
        if (fileObject.path) {
          removeLocalFiles(fileObject.path);
        }
        // });
      });
    }
  } catch (error) {
    console.log("error while removing local files: ", error);
  }
};

export { removeUnusedMulterImageFilesOnError, escapeRegex };

import multer from "multer";

const maxMb = Number(process.env.MAX_FILE_MB || 1);
const maxFiles = Number(process.env.MAX_FILES || 20);

// Use memory storage so we can pass buffers to Gemini easily
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: isNaN(maxFiles) ? 20 : maxFiles,
    fileSize: (isNaN(maxMb) ? 1 : maxMb) * 1024 * 1024,
  },
});

export default upload;

import { UploadedFile } from "@/src/components/chatUI/uploaded-files-input/UploadFiles";

// Helper function to convert file to UploadedFile format
export const convertToUploadedFile = (file: any): UploadedFile => {
  console.log('Converting file:', {
    hasUri: !!file.uri,
    hasBase64: !!file.base64,
    name: file.name || file.fileName,
    type: file.type || file.mimeType
  });
  
  // Generate a unique ID if not present
  const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract file info with fallbacks
  const fileName = file.name || file.fileName || file.uri?.split('/').pop() || 'Unknown';
  const fileType = file.type || file.mimeType || 'application/octet-stream';
  const fileSize = file.size || file.fileSize || 0;
  
  const uploadedFile: UploadedFile = {
    id: fileId,
    name: fileName,
    type: fileType,
    size: fileSize,
    uri: file.uri,
    base64: file.base64,
    thumbnail: file.thumbnail,
    uploadProgress: 0,
    isUploading: false,
  };
  
  console.log('Converted to UploadedFile:', {
    id: uploadedFile.id,
    name: uploadedFile.name,
    type: uploadedFile.type,
    hasUri: !!uploadedFile.uri,
    hasBase64: !!uploadedFile.base64
  });
  
  return uploadedFile;
};
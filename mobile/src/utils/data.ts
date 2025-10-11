import { UploadedFile } from "../components/chatUI/uploaded-files-input/UploadFiles";

export const sampleUploadedFile: UploadedFile[] = [
    {
      id: '1',
      name: 'photo.png',
      type: 'image',
      uri: 'https://via.placeholder.com/150',
      thumbnail: 'https://via.placeholder.com/150',
      size: 24576,
      isUploading: false,
    },
    {
      id: '2',
      name: 'report.pdf',
      type: 'pdf',
      size: 1048576,
      isUploading: false,
    },
    {
      id: '3',
      name: 'voice.mp3',
      type: 'audio',
      size: 204800,
      isUploading: true,
      uploadProgress: 60,
    }
  ];

// uploadAudioFile.ts
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { Alert } from 'react-native';
import supabase from '../../supabase/supabaseClient';

export const uploadAudioFile = async (
  userId: string | number,
  file: {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  }
) => {
  try {
    const base64Audio = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const buffer = Buffer.from(base64Audio, 'base64');
    const fileName = file.name || `${Date.now()}.mp3`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('user-audio')
      .upload(filePath, buffer, {
        contentType: file.mimeType || 'audio/mpeg',
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: signedData, error: signedError } = await supabase.storage
      .from('user-audio')
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${signedError?.message}`);
    }

    return {
      signedUrl: signedData.signedUrl,
      id: data?.path || filePath, 
    };
  } catch (error: any) {
    console.error('Error uploading audio:', error.message);
    
    // Show error alert
    Alert.alert(
      'Upload Failed',
      `Failed to upload audio file: ${error.message}`,
      [{ text: 'OK', style: 'destructive' }]
    );
    
    throw error;
  }
};

// Delete audio file from Supabase storage
export const deleteAudioFile = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('user-audio')
      .remove([filePath]);

    if (error) throw new Error(`Delete failed: ${error.message}`);

    console.log('Audio file deleted successfully:', filePath);
    return { success: true, deletedPath: filePath };
  } catch (error: any) {
    console.error('Error deleting audio:', error.message);
    
    // Show error alert
    Alert.alert(
      'Delete Failed',
      `Failed to delete audio file: ${error.message}`,
      [{ text: 'OK', style: 'destructive' }]
    );
    
    throw error;
  }
};

// Delete multiple audio files from Supabase storage
export const deleteMultipleAudioFiles = async (filePaths: string[]) => {
  try {
    const { data, error } = await supabase.storage
      .from('user-audio')
      .remove(filePaths);

    if (error) throw new Error(`Bulk delete failed: ${error.message}`);

    console.log('Audio files deleted successfully:', filePaths);
    return { success: true, deletedPaths: filePaths };
  } catch (error: any) {
    console.error('Error deleting multiple audio files:', error.message);
    
    // Show error alert
    Alert.alert(
      'Delete Failed',
      `Failed to delete audio files: ${error.message}`,
      [{ text: 'OK', style: 'destructive' }]
    );
    
    throw error;
  }
};

// Delete all audio files for a specific user
export const deleteUserAudioFiles = async (userId: string | number) => {
  try {
    // First, list all files in the user's folder
    const { data: files, error: listError } = await supabase.storage
      .from('user-audio')
      .list(`${userId}/`);

    if (listError) throw new Error(`Failed to list files: ${listError.message}`);

    if (!files || files.length === 0) {
      console.log('No audio files found for user:', userId);
      return { success: true, deletedCount: 0 };
    }

    // Create full file paths
    const filePaths = files.map(file => `${userId}/${file.name}`);

    // Delete all files
    const { data, error } = await supabase.storage
      .from('user-audio')
      .remove(filePaths);

    if (error) throw new Error(`Failed to delete user files: ${error.message}`);

    console.log(`Deleted ${files.length} audio files for user:`, userId);
    return { success: true, deletedCount: files.length, deletedPaths: filePaths };
  } catch (error: any) {
    console.error('Error deleting user audio files:', error.message);
    
    // Show error alert
    Alert.alert(
      'Delete Failed',
      `Failed to delete user audio files: ${error.message}`,
      [{ text: 'OK', style: 'destructive' }]
    );
    
    throw error;
  }
};
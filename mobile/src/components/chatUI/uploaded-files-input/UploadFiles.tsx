import React, { useEffect, useMemo, useCallback, memo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';

export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  uri?: string;
  base64?: string;
  size?: number;
  uploadProgress?: number;
  isUploading?: boolean;
  thumbnail?: string;
};

type UploadedFilesProps = {
  files: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
};

// Utility functions outside component to prevent recreation
const getIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType.includes('image')) return 'image-outline';
  if (lowerType.includes('pdf')) return 'document-outline';
  if (lowerType.includes('video')) return 'videocam-outline';
  if (lowerType.includes('audio')) return 'musical-notes-outline';
  if (lowerType.includes('word')) return 'document-text-outline';
  if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) return 'grid-outline';
  return 'document-outline';
};

const formatSize = (bytes?: number) => {
  if (!bytes || bytes === 0) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const isImageFile = (fileName: string, fileType: string) => {
  const imageExt = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
  const lowerFileName = fileName?.toLowerCase() || '';
  const lowerFileType = fileType?.toLowerCase() || '';
  return lowerFileType.includes('image') || imageExt.some(ext => lowerFileName.endsWith(ext));
};

const getImageSource = (file: UploadedFile) => {
  if (file.thumbnail) return file.thumbnail;
  if (file.uri) return file.uri;
  if (file.base64) {
    return file.base64.startsWith('data:')
      ? file.base64
      : `data:${file.type};base64,${file.base64}`;
  }
  return undefined;
};

// Minimum upload animation duration (in milliseconds)
const MIN_UPLOAD_DURATION = 1500;

// Memoized FileItem component
const FileItem = memo(({ 
  file, 
  onRemoveFile 
}: { 
  file: UploadedFile; 
  onRemoveFile?: (fileId: string) => void;
}) => {
  const imageSource = getImageSource(file);
  const isImage = isImageFile(file.name, file.type);
  const [showUploadAnimation, setShowUploadAnimation] = useState(file.isUploading);
  const uploadStartTimeRef = useRef<number | null>(null);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    if (file.isUploading) {
      // Mark when upload started
      if (!uploadStartTimeRef.current) {
        uploadStartTimeRef.current = Date.now();
      }
      setShowUploadAnimation(true);
      
      // Clear any existing timeout
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    } else if (uploadStartTimeRef.current && showUploadAnimation) {
      // Calculate how long the upload has been showing
      const elapsedTime = Date.now() - uploadStartTimeRef.current;
      const remainingTime = Math.max(0, MIN_UPLOAD_DURATION - elapsedTime);
      
      // Wait for remaining time before hiding animation
      uploadTimeoutRef.current = setTimeout(() => {
        setShowUploadAnimation(false);
        uploadStartTimeRef.current = null;
      }, remainingTime);
    }

    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, [file.isUploading, showUploadAnimation]);

  const handleRemove = useCallback(() => {
    onRemoveFile?.(file.id);
  }, [file.id, onRemoveFile]);

  if (isImage && imageSource) {
    return (
      <View style={styles.itemWrapper}>
        <View style={styles.imageCard}>
          <Image
            source={{ uri: imageSource }}
            style={styles.image}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color="black" />
          </TouchableOpacity>

          <Text style={styles.imageName} numberOfLines={1}>
            {file.name}
          </Text>
          {file.size && file.size > 0 && (
            <Text style={styles.imageSize}>{formatSize(file.size)}</Text>
          )}
          {showUploadAnimation && (
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${file.uploadProgress ?? 0}%` },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.itemWrapper}>
      <View style={styles.filePill}>
        <Ionicons
          name={getIcon(file.type)}
          size={16}
          color={Colors.dark.txtSecondary}
          style={styles.fileIcon}
        />
        <Text numberOfLines={1} style={styles.fileName}>
          {file.name}
        </Text>
        {file.size && file.size > 0 && (
          <Text style={styles.fileSize}> • {formatSize(file.size)}</Text>
        )}
        {showUploadAnimation && (
          <Text style={styles.uploadingText}> • Uploading</Text>
        )}
        {onRemoveFile && (
          <TouchableOpacity 
            onPress={handleRemove}
            activeOpacity={0.7}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={14}
              color={Colors.dark.txtSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.file.name === nextProps.file.name &&
    prevProps.file.uri === nextProps.file.uri &&
    prevProps.file.base64 === nextProps.file.base64 &&
    prevProps.file.uploadProgress === nextProps.file.uploadProgress &&
    prevProps.file.isUploading === nextProps.file.isUploading &&
    prevProps.onRemoveFile === nextProps.onRemoveFile
  );
});

FileItem.displayName = 'FileItem';

const UploadedFiles: React.FC<UploadedFilesProps> = ({ files, onRemoveFile }) => {
  // Memoize valid files
  const validFiles = useMemo(() => {
    if (!Array.isArray(files)) return [];
    return files.filter(file => file && file.id && file.name);
  }, [files]);

  // Animated values
  const fade = useSharedValue(validFiles.length > 0 ? 1 : 0);
  const slide = useSharedValue(validFiles.length > 0 ? 0 : 10);

  // Run animation when validFiles length changes
  useEffect(() => {
    const visible = validFiles.length > 0;
    fade.value = withTiming(visible ? 1 : 0, { duration: 200 });
    slide.value = withTiming(visible ? 0 : 10, { duration: 200 });
  }, [validFiles.length]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }), []);

  // Memoized render function
  const renderFile = useCallback(({ item }: { item: UploadedFile }) => (
    <FileItem file={item} onRemoveFile={onRemoveFile} />
  ), [onRemoveFile]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: UploadedFile) => item.id, []);

  // Early return if no valid files
  if (validFiles.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <FlatList
        data={validFiles}
        renderItem={renderFile}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
      />
    </Animated.View>
  );
};

// Export with memo
export default memo(UploadedFiles, (prevProps, nextProps) => {
  // Only re-render if files array reference changes AND content is different
  if (prevProps.files === nextProps.files && prevProps.onRemoveFile === nextProps.onRemoveFile) {
    return true; // Props are equal, don't re-render
  }
  
  // Check if files content is the same
  if (prevProps.files.length !== nextProps.files.length) {
    return false; // Different length, re-render
  }
  
  // Deep comparison of file ids and key properties
  const filesEqual = prevProps.files.every((file, index) => {
    const nextFile = nextProps.files[index];
    return (
      file.id === nextFile.id &&
      file.uri === nextFile.uri &&
      file.base64 === nextFile.base64 &&
      file.uploadProgress === nextFile.uploadProgress &&
      file.isUploading === nextFile.isUploading
    );
  });
  
  return filesEqual && prevProps.onRemoveFile === nextProps.onRemoveFile;
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8
  },
  flatListContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  itemWrapper: {
    marginRight: 10,
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgPrimary,
    borderColor: Colors.dark.borderColor,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 250,
  },
  fileIcon: {
    marginRight: 4,
  },
  closeButton: {
    marginLeft: 6,
    padding: 2,
  },
  imageCard: {
    width: 100,
    backgroundColor: `${Colors.dark.bgPrimary}80`,
    borderRadius: 10,
    padding: 6,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.dark.borderColor,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  imageName: {
    fontSize: 11,
    color: Colors.dark.txtPrimary,
    marginTop: 4,
    fontFamily: 'Manrope-Medium',
  },
  imageSize: {
    fontSize: 10,
    color: Colors.dark.txtSecondary,
    fontFamily: 'Manrope-Regular',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: Colors.dark.borderColor,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#4ade80',
    borderRadius: 2,
  },
  fileName: {
    fontSize: 13,
    color: Colors.dark.txtPrimary,
    maxWidth: 150,
    fontFamily: 'Manrope-Medium',
  },
  fileSize: {
    fontSize: 11,
    color: Colors.dark.txtSecondary,
    fontFamily: 'Manrope-Regular',
  },
  uploadingText: {
    fontSize: 11,
    color: '#FBBF24',
    fontFamily: 'Manrope-Medium',
  },
});
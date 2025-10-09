import React, { useEffect, useMemo, useCallback } from 'react';
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

const UploadedFiles: React.FC<UploadedFilesProps> = ({ files, onRemoveFile }) => {
  // Debug logging
  useEffect(() => {
    console.log('UploadedFiles rendered with:', {
      filesCount: files?.length || 0,
      files: files?.map(f => ({
        id: f?.id,
        name: f?.name,
        type: f?.type,
        hasUri: !!f?.uri,
        hasBase64: !!f?.base64,
      }))
    });
  }, [files]);

  // Memoize valid files to prevent unnecessary recalculations
  const validFiles = useMemo(() => {
    if (!Array.isArray(files)) {
      console.warn('Files is not an array:', files);
      return [];
    }
    
    const valid = files.filter(file => {
      const isValid = file && file.id && file.name;
      if (!isValid) {
        console.warn('Invalid file filtered out:', file);
      }
      return isValid;
    });
    
    console.log('Valid files count:', valid.length);
    return valid;
  }, [files]);

  // Animated values
  const fade = useSharedValue(0);
  const slide = useSharedValue(10);

  // Run animation when validFiles length changes
  useEffect(() => {
    const visible = validFiles.length > 0;
    console.log('Animating visibility:', visible);
    fade.value = withTiming(visible ? 1 : 0, { duration: 200 });
    slide.value = withTiming(visible ? 0 : 10, { duration: 200 });
  }, [validFiles.length, fade, slide]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  // Memoized utility functions
  const getIcon = useCallback((type: string): keyof typeof Ionicons.glyphMap => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('image')) return 'image-outline';
    if (lowerType.includes('pdf')) return 'document-outline';
    if (lowerType.includes('video')) return 'videocam-outline';
    if (lowerType.includes('audio')) return 'musical-notes-outline';
    if (lowerType.includes('word')) return 'document-text-outline';
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) return 'grid-outline';
    return 'document-outline';
  }, []);

  const formatSize = useCallback((bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }, []);

  const isImageFile = useCallback((fileName: string, fileType: string) => {
    const imageExt = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
    const lowerFileName = fileName?.toLowerCase() || '';
    const lowerFileType = fileType?.toLowerCase() || '';
    
    const isImage = lowerFileType.includes('image') || imageExt.some(ext => lowerFileName.endsWith(ext));
    console.log('isImageFile check:', { fileName, fileType, isImage });
    return isImage;
  }, []);

  const getImageSource = useCallback((file: UploadedFile) => {
    let source = undefined;
    
    if (file.thumbnail) {
      source = file.thumbnail;
      console.log('Using thumbnail:', source);
    } else if (file.uri) {
      source = file.uri;
      console.log('Using URI:', source);
    } else if (file.base64) {
      source = file.base64.startsWith('data:')
        ? file.base64
        : `data:${file.type};base64,${file.base64}`;
      console.log('Using base64 (length):', file.base64.length);
    }
    
    return source;
  }, []);

  // Memoized render function
  const renderFile = useCallback(({ item: file, index }: { item: UploadedFile; index: number }) => {
    console.log(`Rendering file ${index}:`, {
      id: file?.id,
      name: file?.name,
      type: file?.type,
    });

    if (!file?.id) {
      console.warn('Skipping file without id:', file);
      return null;
    }

    const imageSource = getImageSource(file);
    const isImage = isImageFile(file.name, file.type);

    console.log(`File ${index} rendering as:`, { isImage, hasSource: !!imageSource });

    return (
      <View style={styles.itemWrapper}>
        {isImage && imageSource ? (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: imageSource }}
              style={styles.image}
              resizeMode="cover"
              onError={(e) => {
                console.error('Image load error:', {
                  file: file.name,
                  error: e.nativeEvent.error
                });
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', file.name);
              }}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                console.log('Removing file:', file.id);
                onRemoveFile?.(file.id);
              }}
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
            {file.isUploading && (
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
        ) : (
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
            {file.isUploading && (
              <Text style={styles.uploadingText}> • Uploading</Text>
            )}
            {onRemoveFile && (
              <TouchableOpacity 
                onPress={() => {
                  console.log('Removing file:', file.id);
                  onRemoveFile(file.id);
                }}
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
        )}
      </View>
    );
  }, [getImageSource, isImageFile, formatSize, getIcon, onRemoveFile]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: UploadedFile, index: number) => {
    return item?.id || `file-fallback-${index}`;
  }, []);

  // Early return if no valid files
  if (validFiles.length === 0) {
    console.log('No valid files to display');
    return null;
  }

  console.log('Rendering FlatList with', validFiles.length, 'files');

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.debugBadge}>
        <Text style={styles.debugText}>{validFiles.length} file(s)</Text>
      </View>
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
      />
    </Animated.View>
  );
};

// Export without memo first to debug
export default UploadedFiles;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  debugBadge: {
    position: 'absolute',
    top: 0,
    right: 10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 999,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  flatListContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
  },
  itemWrapper: {
    marginRight: 8,
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
    backgroundColor: Colors.dark.bgPrimary,
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